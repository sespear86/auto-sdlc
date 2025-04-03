import logging
import os
import json
import glob
import pyperclip
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, StaleElementReferenceException, NoSuchElementException
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
    "download_prompt_for_download": False,
    "download.directory_upgrade": True,
    "safebrowsing.enabled": True
})

# Initialize driver
driver = webdriver.Chrome(options=chrome_options)
logging.info("Initialized Chrome driver")

def get_fresh_element(driver, by, value, timeout=20, max_retries=3):
    """Locate elements with retries, ensuring they are interactable."""
    for attempt in range(max_retries):
        try:
            element = WebDriverWait(driver, timeout).until(
                EC.element_to_be_clickable((by, value))
            )
            if element.is_displayed() and element.is_enabled():
                driver.execute_script("arguments[0].scrollIntoView(true);", element)
                element.click()  # Ensure focus for textareas
                logging.info(f"Located and focused element: {value}")
                return element
            else:
                raise TimeoutException("Element not interactable")
        except TimeoutException:
            logging.warning(f"Retry {attempt + 1}/{max_retries} for element {value}")
            if attempt == max_retries - 1:
                with open('D:\\Documents\\AutoSDLC\\logs\\page_source.html', 'w', encoding='utf-8') as f:
                    f.write(driver.page_source)
                logging.error(f"Failed to locate interactable element: {value}. Page source saved")
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

def wait_for_copy_text_button(driver, prompt_count, max_wait=120):
    """Wait for the correct number of Copy text buttons and return the latest one."""
    start_time = time.time()
    last_log_time = start_time

    while time.time() - start_time < max_wait:
        try:
            page_buttons = driver.find_elements(By.XPATH, "//button[@aria-label]")
            copy_text_buttons = [btn for btn in page_buttons if "copy text" in btn.get_attribute("aria-label").lower()]
            
            current_time = time.time()
            if current_time - last_log_time >= 10 or len(copy_text_buttons) == prompt_count:
                if len(copy_text_buttons) == prompt_count:
                    logging.info(f"Found {len(copy_text_buttons)} Copy text buttons, matches prompt count {prompt_count}")
                    return copy_text_buttons[-1]  # Return the latest button
                else:
                    logging.info(f"Found {len(copy_text_buttons)} Copy text buttons, expected {prompt_count}. Waiting...")
                last_log_time = current_time
            time.sleep(1)
        except StaleElementReferenceException:
            logging.warning("Stale element in button check, retrying")
            time.sleep(1)

    logging.error("Copy text button not found with correct prompt count within max wait time")
    return None

def send_prompt_and_copy_response(driver, prompt, prompt_count):
    """Send a prompt, verify it's sent, click Copy text, and retrieve the response from the clipboard."""
    text_input = get_fresh_element(driver, By.XPATH, "//textarea[@placeholder='Ask anything']")
    if not text_input:
        raise Exception("Text input field not found")

    # Clear the textarea and send the prompt
    text_input.clear()
    prompt_parts = prompt.split("\n")
    for i, part in enumerate(prompt_parts):
        text_input.send_keys(part)
        if i < len(prompt_parts) - 1:
            text_input.send_keys(Keys.SHIFT + Keys.RETURN)
    text_input.send_keys(Keys.RETURN)
    logging.info("Prompt submitted")

    # Verify the prompt appears in the chat
    issue_number = prompt.split(":")[1].strip().split(" ")[0] + " " + prompt.split(":")[1].strip().split(" ")[1]  # e.g., "Issue #3"
    prompt_selector = f"//div[contains(@class, 'r-a8ghvy') and contains(., '{issue_number}')]"
    max_wait = 20
    start_time = time.time()
    while time.time() - start_time < max_wait:
        try:
            prompt_element = driver.find_element(By.XPATH, prompt_selector)
            logging.info("Prompt verified in chat")
            break
        except NoSuchElementException:
            logging.info("Prompt not yet in chat, waiting...")
            time.sleep(1)
    else:
        with open('D:\\Documents\\AutoSDLC\\logs\\page_source_prompt_failure.html', 'w', encoding='utf-8') as f:
            f.write(driver.page_source)
        raise Exception("Prompt failed to appear in chat after submission. Page source saved for debugging.")

    # Wait for the Copy text button and copy the response
    copy_button = wait_for_copy_text_button(driver, prompt_count)
    if not copy_button:
        raise Exception("Failed to locate Copy text button")

    # Try clipboard method first
    response = None
    pyperclip.copy("")  # Clear the clipboard
    for attempt in range(3):
        try:
            driver.execute_script("arguments[0].scrollIntoView(true);", copy_button)
            time.sleep(1)  # Wait for any overlays to clear
            copy_button.click()  # Try native Selenium click
            time.sleep(3)  # Increased delay to ensure clipboard updates
            response = pyperclip.paste()
            logging.info(f"Clipboard content after attempt {attempt + 1}: '{response}'")
            if response and prompt not in response and "import logging" not in response and len(response) > 50:
                logging.info("Clipboard capture successful")
                break
            logging.warning(f"Clipboard content not updated (attempt {attempt + 1}/3), retrying...")
        except Exception as e:
            logging.warning(f"Native click failed (attempt {attempt + 1}/3): {e}, trying JavaScript click...")
            try:
                driver.execute_script("arguments[0].click();", copy_button)
                time.sleep(3)
                response = pyperclip.paste()
                logging.info(f"Clipboard content after JS attempt {attempt + 1}: '{response}'")
                if response and prompt not in response and "import logging" not in response and len(response) > 50:
                    logging.info("Clipboard capture successful via JS click")
                    break
                logging.warning(f"Clipboard content not updated after JS click (attempt {attempt + 1}/3), retrying...")
            except Exception as e2:
                logging.warning(f"JS click failed (attempt {attempt + 1}/3): {e2}, retrying...")
    else:
        logging.warning("Clipboard method failed, falling back to DOM scraping")

        # Fallback: Scrape the response from the DOM
        message_selector = "//div[contains(@class, 'r-a8ghvy')]"
        messages = driver.find_elements(By.XPATH, message_selector)
        if not messages:
            raise Exception("No messages found for DOM scraping fallback")

        # Find the message with the current Copy text button
        end_index = 0
        for i, msg in enumerate(messages):
            try:
                buttons_in_msg = msg.find_elements(By.XPATH, ".//button[translate(@aria-label, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz')='copy text']")
                # Re-find the copy button to avoid stale reference
                page_buttons = driver.find_elements(By.XPATH, "//button[@aria-label]")
                copy_text_buttons = [btn for btn in page_buttons if "copy text" in btn.get_attribute("aria-label").lower()]
                current_copy_button = copy_text_buttons[prompt_count - 1]
                if any(btn == current_copy_button for btn in buttons_in_msg):
                    end_index = i
                    break
            except StaleElementReferenceException:
                continue
        else:
            raise Exception("Could not locate current Copy text button for DOM scraping")

        # Collect response text
        full_text_parts = []
        seen_texts = set()
        msg = messages[end_index]
        text_elements = msg.find_elements(By.XPATH, ".//*[text()]")
        msg_text_parts = []
        for elem in text_elements:
            text = elem.text.strip()
            normalized_text = " ".join(text.lower().split())
            if text and normalized_text not in seen_texts:
                msg_text_parts.append(text)
                seen_texts.add(normalized_text)
        response = " ".join(msg_text_parts).strip()
        if not response:
            raise Exception("Failed to capture response via DOM scraping")

    logging.info(f"Captured response text length: {len(response)} chars")
    logging.info(f"Captured response text: {response}")
    return response

def export_chat(driver, max_retries=3):
    """Export chat history."""
    for attempt in range(max_retries):
        try:
            export_button = get_fresh_element(driver, By.XPATH, "//span[normalize-space()='Export session']")
            if not export_button:
                raise Exception("Export session button not found")
            time.sleep(5)
            
            # Log page source for debugging
            with open(f'D:\\Documents\\AutoSDLC\\logs\\page_source_export_attempt_{attempt + 1}.html', 'w', encoding='utf-8') as f:
                f.write(driver.page_source)
            
            json_button = None
            try:
                json_button = get_fresh_element(driver, By.XPATH, "//div[contains(@class, 'export-option') and @data-format='json']", timeout=30)
            except Exception as e:
                logging.warning(f"Primary JSON export XPath failed: {e}, trying fallback XPath")
                json_button = get_fresh_element(driver, By.XPATH, "//div[contains(@class, 'export-option') and contains(text(), 'JSON')]", timeout=30)
            
            if not json_button:
                driver.save_screenshot(f'D:\\Documents\\AutoSDLC\\logs\\export_failure_attempt_{attempt + 1}.png')
                raise Exception("JSON export option not found")
            
            driver.execute_script("arguments[0].scrollIntoView(true);", json_button)
            driver.execute_script("arguments[0].click();", json_button)
            time.sleep(15)
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
            
            response = send_prompt_and_copy_response(driver, f"Analyze this requirement: {req}", prompt_count)
            f.write(f"{req}\nAnalysis: {response}\n\n")
            
            if export_chat(driver):
                export_data = get_latest_export()
                if export_data:
                    latest_response = None
                    for entry in reversed(export_data):
                        if entry.get("role") == "assistant":
                            latest_response = entry.get("content")
                            break
                    logging.info(f"Exported response: {latest_response}")
                    captured_normalized = "".join(response.split())
                    exported_normalized = "".join(latest_response.split())
                    if captured_normalized == exported_normalized:
                        logging.info("Response matches export, proceeding")
                    else:
                        logging.warning("Response does not match export, possible clipboard issue")
                        response = latest_response
                        f.seek(0, os.SEEK_END)
                        f.write(f"{req}\nAnalysis: {response}\n\n")
                else:
                    logging.warning("No export data found, proceeding with captured response")
            else:
                logging.warning("Failed to export chat history after prompt, proceeding with captured response")

            print(f"Analysis for '{req}' saved.")
            logging.info(f"Analysis for '{req}' saved.")

    if export_chat(driver):
        print("Chat history exported to D:\\Documents\\AutoSDLC\\Downloads")
        logging.info("Chat history exported successfully")
    else:
        print("Failed to export chat history")
        logging.error("Failed to export chat history")

finally:
    if 'driver' in locals():
        time.sleep(2)  # Allow UI to finish rendering
        driver.quit()
        print("Browser closed.")
        logging.info("Browser closed.")