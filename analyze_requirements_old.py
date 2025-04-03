import logging
import os
import json
import glob
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, StaleElementReferenceException
import time

# Ensure directories exist
os.makedirs('D:\\Documents\\AutoSDLC\\logs', exist_ok=True)
os.makedirs('D:\\Documents\\AutoSDLC\\Downloads', exist_ok=True)

# Set up logging
logging.basicConfig(
    filename='D:\\Documents\\AutoSDLC\\logs\\analyze_requirements.log',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
console = logging.StreamHandler()
console.setLevel(logging.INFO)
formatter = logging.Formatter('%(levelname)s - %(message)s')
console.setFormatter(formatter)
logging.getLogger('').addHandler(console)

logging.info("Ensured log and download directories exist")

# Chrome options
chrome_options = Options()
user_data_dir = r"C:\Users\Irika\AppData\Local\Google\Chrome\User Data"
profile_directory = "Default"
chrome_options.add_argument(f"--user-data-dir={user_data_dir}")
chrome_options.add_argument(f"--profile-directory={profile_directory}")
chrome_options.add_experimental_option("prefs", {
    "download.default_directory": r"D:\Documents\AutoSDLC\Downloads",
    "download.prompt_for_download": False,
    "download.directory_upgrade": True,
    "safebrowsing.enabled": True
})

# Initialize driver
driver = webdriver.Chrome(options=chrome_options)
logging.info("Initialized Chrome driver")

def get_fresh_element(driver, by, value, timeout=20, max_retries=3):
    """Locate elements with retries."""
    for attempt in range(max_retries):
        try:
            element = WebDriverWait(driver, timeout).until(
                EC.element_to_be_clickable((by, value))
            )
            logging.info(f"Located element: {value}")
            return element
        except TimeoutException:
            logging.warning(f"Retry {attempt + 1}/{max_retries} for element {value}")
            if attempt == max_retries - 1:
                with open('D:\\Documents\\AutoSDLC\\logs\\page_source.html', 'w', encoding='utf-8') as f:
                    f.write(driver.page_source)
                logging.error(f"Failed to locate element: {value}. Page source saved")
                return None
            time.sleep(2)
    return None

def check_for_login_page(driver):
    """Check for login page and prompt for manual login."""
    if "login" in driver.current_url.lower():
        logging.warning("Detected login page. Manual login required.")
        print("Login page detected. Please log in manually, then press Enter...")
        input("Press Enter after logging in...")
        WebDriverWait(driver, 20).until(
            lambda d: "grok" in d.current_url.lower()
        )
        logging.info("Redirected to Grok Chat UI after login")

def get_latest_export():
    """Get the latest exported JSON file from the Downloads folder."""
    files = glob.glob(r"D:\Documents\AutoSDLC\Downloads\*.json")
    if not files:
        return None
    latest_file = max(files, key=os.path.getctime)
    with open(latest_file, 'r', encoding='utf-8') as f:
        return json.load(f)

def wait_for_response_completion(driver, prompt_count, max_wait=120):
    """Wait for the response to complete by checking for the Copy text button."""
    message_selector = "//div[contains(@class, 'r-a8ghvy') and .//span[contains(@class, 'r-1ttztb7')]]"
    start_time = time.time()
    last_log_time = start_time

    # Step 1: Wait for the Copy text button with the correct prompt count
    copy_text_buttons = []
    while time.time() - start_time < max_wait:
        try:
            page_buttons = driver.find_elements(By.XPATH, "//button[@aria-label]")
            copy_text_buttons = []
            for btn in page_buttons:
                aria_label = btn.get_attribute("aria-label").lower()
                if "copy text" in aria_label.lower():
                    copy_text_buttons.append(btn)
            
            current_time = time.time()
            # Log only every 10 seconds
            if current_time - last_log_time >= 10 or len(copy_text_buttons) == prompt_count:
                if len(copy_text_buttons) == prompt_count:
                    logging.info(f"Found {len(copy_text_buttons)} Copy text buttons, matches prompt count {prompt_count}")
                else:
                    logging.info(f"Found {len(copy_text_buttons)} Copy text buttons, expected {prompt_count}. Waiting for Copy text button...")
                last_log_time = current_time

            if len(copy_text_buttons) == prompt_count:
                # Wait to ensure UI rendering is complete
                time.sleep(10)
                break
            
            time.sleep(1)
        except StaleElementReferenceException:
            logging.warning("Stale element in button check, retrying")
            time.sleep(1)

    if len(copy_text_buttons) != prompt_count:
        logging.error("Copy text button not found with correct prompt count within max wait time")
        return None

    # Step 2: Capture the full response text by aggregating messages
    try:
        messages = driver.find_elements(By.XPATH, message_selector)
        if not messages:
            logging.error("No messages found after Copy text button detection")
            return None

        # Determine the start index of the current response
        # For prompt_count=1, start from the beginning (index 0)
        # For prompt_count>1, find the message with the (prompt_count-1)th Copy text button
        start_index = 0
        if prompt_count > 1:
            previous_copy_button = copy_text_buttons[prompt_count - 2]  # (prompt_count-1)th button
            try:
                previous_message = previous_copy_button.find_element(By.XPATH, "./ancestor::div[contains(@class, 'r-a8ghvy')]")
                start_index = messages.index(previous_message) + 1
            except (StaleElementReferenceException, NoSuchElementException, ValueError):
                logging.warning("Could not locate previous message with Copy text button, starting from last known position")
                # Fallback: Start from the last message before the current Copy text button
                current_copy_button = copy_text_buttons[-1]
                for i in range(len(messages) - 1, -1, -1):
                    msg = messages[i]
                    try:
                        copy_buttons_in_msg = msg.find_elements(By.XPATH, ".//button[translate(@aria-label, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz')='copy text']")
                        if copy_buttons_in_msg and any(btn == current_copy_button for btn in copy_buttons_in_msg):
                            start_index = i
                            break
                    except StaleElementReferenceException:
                        continue

        # Collect text from messages starting at start_index until the next Copy text button
        full_text_parts = []
        for i in range(start_index, len(messages)):
            msg = messages[i]
            # Check if this message has a Copy text button (indicating the start of a new response)
            try:
                copy_buttons_in_msg = msg.find_elements(By.XPATH, ".//button[translate(@aria-label, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz')='copy text']")
                if copy_buttons_in_msg and not any(btn == copy_text_buttons[prompt_count - 1] for btn in copy_buttons_in_msg):
                    break  # This is the start of a new response
            except StaleElementReferenceException:
                continue
            
            # Collect text from this message
            text_elements = msg.find_elements(By.CLASS_NAME, "r-1ttztb7")
            msg_text = " ".join([elem.text for elem in text_elements if elem.text]).strip()
            if msg_text:
                full_text_parts.append(msg_text)

        full_text = " ".join(full_text_parts).strip()
        logging.info(f"Captured response text length: {len(full_text)} chars")
        logging.info(f"Captured response text: {full_text}")
        return full_text
    except StaleElementReferenceException:
        logging.error("Stale element while capturing response text")
        return None

def send_prompt(driver, prompt, prompt_count):
    """Send a prompt and wait for the response."""
    text_input = get_fresh_element(driver, By.XPATH, "//textarea[@placeholder='Ask anything']")
    if not text_input:
        raise Exception("Text input field not found")
    
    text_input.clear()
    prompt_parts = prompt.split("\n")
    for i, part in enumerate(prompt_parts):
        text_input.send_keys(part)
        if i < len(prompt_parts) - 1:
            text_input.send_keys(Keys.SHIFT + Keys.RETURN)
    text_input.send_keys(Keys.RETURN)
    logging.info("Prompt submitted")

    response = wait_for_response_completion(driver, prompt_count)
    if response:
        return response
    raise Exception("Failed to get response")

def export_chat(driver, max_retries=3):
    """Export chat history."""
    for attempt in range(max_retries):
        try:
            export_button = get_fresh_element(driver, By.XPATH, "//span[normalize-space()='Export session']")
            if not export_button:
                raise Exception("Export session button not found")
            driver.execute_script("arguments[0].click();", export_button)
            time.sleep(1)
            
            json_button = get_fresh_element(driver, By.XPATH, "//div[contains(@class, 'export-option') and @data-format='json']")
            if not json_button:
                raise Exception("JSON export option not found")
            driver.execute_script("arguments[0].click();", json_button)
            time.sleep(10)
            logging.info("Exported session to JSON")
            return True
        except Exception as e:
            logging.error(f"Export attempt {attempt + 1} failed: {e}")
            if attempt == max_retries - 1:
                return False
            time.sleep(2)
    return False

try:
    driver.get("https://x.com/i/grok")
    logging.info("Opened Grok Chat UI")
    check_for_login_page(driver)
    
    WebDriverWait(driver, 20).until(
        EC.presence_of_element_located((By.XPATH, "//textarea[@placeholder='Ask anything']"))
    )

    with open("requirements.txt", "r", encoding="utf-8") as f:
        requirements = f.read().splitlines()

    prompt_count = 0
    with open("analyzed_requirements.txt", "w", encoding="utf-8") as f:
        for req in requirements:
            prompt_count += 1
            print(f"Analyzing: {req}")
            logging.info(f"Analyzing requirement: {req}")
            
            response = send_prompt(driver, f"Analyze this requirement: {req}", prompt_count)
            f.write(f"{req}\nAnalysis: {response}\n\n")
            
            # Export chat and verify response
            if export_chat(driver):
                export_data = get_latest_export()
                if export_data:
                    # Find the latest assistant response
                    latest_response = None
                    for entry in reversed(export_data):
                        if entry.get("role") == "assistant":
                            latest_response = entry.get("content")
                            break
                    if latest_response and latest_response == response:
                        logging.info("Response matches export, proceeding")
                    else:
                        logging.warning("Response does not match export, possible incomplete capture")
                        response = latest_response  # Use the export response if different
                        f.seek(0, os.SEEK_END)  # Go to end of file
                        f.write(f"{req}\nAnalysis: {response}\n\n")  # Overwrite with correct response
                else:
                    logging.warning("No export data found, proceeding with captured response")
            else:
                logging.error("Failed to export chat history after prompt")

            print(f"Analysis for '{req}' saved.")
            logging.info(f"Analysis for '{req}' saved.")

    if export_chat(driver):
        print("Chat history exported to D:\\Documents\\AutoSDLC\\Downloads")
        logging.info("Chat history exported successfully")
    else:
        print("Failed to export chat history")
        logging.error("Failed to export chat history")

finally:
    driver.quit()
    print("Browser closed.")
    logging.info("Browser closed.")