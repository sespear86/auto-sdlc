import logging
import os
import json
import glob
import pyperclip
from datetime import datetime
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

# Set up logging with timestamped archive
current_time = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
log_file = f'D:\\Documents\\AutoSDLC\\logs\\analyze_requirements_{current_time}.log'
logging.basicConfig(
    filename=log_file,
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

def wait_for_clipboard_update(initial_content, max_wait=10):
    """Poll for clipboard update instead of fixed delay."""
    start_time = time.time()
    while time.time() - start_time < max_wait:
        current_content = pyperclip.paste()
        if current_content != initial_content:
            logging.info("Clipboard updated successfully")
            return current_content
        time.sleep(0.5)
    raise Exception("Clipboard did not update within max wait time")

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
                    return copy_text_buttons[-1]
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
    issue_number = prompt.split(":")[1].strip().split(" ")[0] + " " + prompt.split(":")[1].strip().split(" ")[1]
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

    # Use polling for clipboard update
    response = None
    pyperclip.copy("")  # Clear the clipboard
    initial_content = pyperclip.paste()
    for attempt in range(3):
        try:
            driver.execute_script("arguments[0].scrollIntoView(true);", copy_button)
            copy_button.click()
            response = wait_for_clipboard_update(initial_content)
            logging.info(f"Clipboard content after attempt {attempt + 1}: '{response[:50]}...'")
            if response and prompt not in response and "import logging" not in response and len(response) > 50:
                logging.info("Clipboard capture successful")
                break
            logging.warning(f"Clipboard content not updated correctly (attempt {attempt + 1}/3), retrying...")
        except Exception as e:
            logging.warning(f"Native click failed (attempt {attempt + 1}/3): {e}, trying JavaScript click...")
            try:
                driver.execute_script("arguments[0].click();", copy_button)
                response = wait_for_clipboard_update(initial_content)
                logging.info(f"Clipboard content after JS attempt {attempt + 1}: '{response[:50]}...'")
                if response and prompt not in response and "import logging" not in response and len(response) > 50:
                    logging.info("Clipboard capture successful via JS click")
                    break
                logging.warning(f"Clipboard content not updated after JS click (attempt {attempt + 1}/3), retrying...")
            except Exception as e2:
                logging.warning(f"JS click failed (attempt {attempt + 1}/3): {e2}, retrying...")
    else:
        logging.warning("Clipboard method failed, falling back to DOM scraping")
        message_selector = "//div[contains(@class, 'r-a8ghvy')]"
        messages = driver.find_elements(By.XPATH, message_selector)
        if not messages:
            raise Exception("No messages found for DOM scraping fallback")

        end_index = 0
        for i, msg in enumerate(messages):
            try:
                buttons_in_msg = msg.find_elements(By.XPATH, ".//button[translate(@aria-label, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz')='copy text']")
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

        full_text_parts = []
        seen_texts = set()
        msg = messages[end_index]
        text_elements = msg.find_elements(By.XPATH, ".//*[text()]")
        for elem in text_elements:
            text = elem.text.strip()
            normalized_text = " ".join(text.lower().split())
            if text and normalized_text not in seen_texts:
                full_text_parts.append(text)
                seen_texts.add(normalized_text)
        response = " ".join(full_text_parts).strip()
        if not response:
            raise Exception("Failed to capture response via DOM scraping")

    logging.info(f"Captured response text length: {len(response)} chars")
    logging.info(f"Captured response text: {response}")
    return response

def export_chat(driver, max_retries=3):
    """Export chat history with dynamic wait for file."""
    for attempt in range(max_retries):
        try:
            export_button = get_fresh_element(driver, By.XPATH, "//span[normalize-space()='Export session']")
            if not export_button:
                raise Exception("Export session button not found")
            time.sleep(5)
            
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
            
            # Dynamic wait for download
            start_time = time.time()
            while time.time() - start_time < 30:
                if glob.glob(r"D:\Documents\AutoSDLC\Downloads\*.json"):
                    logging.info("Exported session to JSON")
                    return True
                time.sleep(1)
            raise Exception("JSON file not found in Downloads after export")
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
    with open("analyzed_requirements.txt", "w", encoding="utf-8") as f_txt, \
         open("analyzed_requirements.md", "w", encoding="utf-8") as f_md:
        for req in requirements:
            prompt_count += 1
            print(f"Analyzing: {req}")
            logging.info(f"Analyzing requirement: {req}")
            
            response = send_prompt_and_copy_response(driver, f"Analyze this requirement: {req}", prompt_count)
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            
            # Write the initial response
            f_txt.write(f"{req}\nTimestamp: {timestamp}\nAnalysis: {response}\n\n")
            f_md.write(f"## {req}\n\n**Timestamp:** {timestamp}\n\n{response}\n\n")
            
            # Export and verify
            if export_chat(driver):
                export_data = get_latest_export()
                if export_data:
                    latest_response = None
                    for entry in reversed(export_data):
                        if entry.get("role") == "assistant" and req in entry.get("content", ""):
                            latest_response = entry.get("content")
                            break
                    if latest_response and latest_response != response:
                        logging.info(f"Export matches requirement, updating response")
                        response = latest_response
                        # Clear the file and rewrite with corrected responses
                        f_txt.seek(0)
                        f_txt.truncate()
                        f_md.seek(0)
                        f_md.truncate()
                        # Re-read requirements to rewrite the file
                        with open("requirements.txt", "r", encoding="utf-8") as f_reread:
                            reread_reqs = f_reread.read().splitlines()
                        temp_prompt_count = 0
                        for reread_req in reread_reqs:
                            temp_prompt_count += 1
                            temp_response = response if reread_req == req else send_prompt_and_copy_response(driver, f"Analyze this requirement: {reread_req}", temp_prompt_count)
                            temp_timestamp = timestamp if reread_req == req else datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                            f_txt.write(f"{reread_req}\nTimestamp: {temp_timestamp}\nAnalysis: {temp_response}\n\n")
                            f_md.write(f"## {reread_req}\n\n**Timestamp:** {temp_timestamp}\n\n{temp_response}\n\n")
                    elif not latest_response:
                        logging.info("Export found but no matching response, keeping clipboard/DOM response")
                    else:
                        logging.info("Export matches clipboard/DOM, no update needed")
                else:
                    logging.warning("No export data found, keeping clipboard/DOM response")
            else:
                logging.warning("Failed to export chat history, keeping clipboard/DOM response")

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
        time.sleep(2)
        driver.quit()
        print("Browser closed.")
        logging.info("Browser closed.")

# Documentation in a README file
readme_content = """# AutoSDLC Requirement Analysis Script

This script automates the analysis of software requirements using Grok Chat UI on X.

## Setup
1. Install dependencies: `pip install requests selenium pytest pyperclip`
2. Set up Chrome with a user profile (configured in script).
3. Ensure ChromeDriver is in PATH.
4. Create `requirements.txt` with your requirements, one per line.
5. Run: `python analyze_requirements.py`

## Output
- Plain text analyses: `analyzed_requirements.txt`
- Markdown analyses: `analyzed_requirements.md`
- Chat history: JSON files in `D:\\Documents\\AutoSDLC\\Downloads`
- Logs: Timestamped files in `D:\\Documents\\AutoSDLC\\logs`

## Dependencies
- Python 3.x
- selenium, pyperclip, requests, pytest
- Chrome browser with Grok Chat Exporter extension (optional)

## Notes
- Ensure you're logged into X/Grok before running.
- Logs are archived with timestamps for each run.
"""
with open("README.md", "w", encoding="utf-8") as f:
    f.write(readme_content)