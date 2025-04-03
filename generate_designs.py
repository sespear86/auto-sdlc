import logging
import os
import re
import subprocess
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, StaleElementReferenceException, NoSuchElementException
import pyperclip

# Ensure directories exist
os.makedirs('D:\\Documents\\AutoSDLC\\logs', exist_ok=True)
os.makedirs('D:\\Documents\\AutoSDLC\\designs', exist_ok=True)

# Set up logging
logging.basicConfig(
    filename='D:\\Documents\\AutoSDLC\\logs\\generate_designs.log',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
console = logging.StreamHandler()
console.setLevel(logging.INFO)
formatter = logging.Formatter('%(levelname)s - %(message)s')
console.setFormatter(formatter)
logging.getLogger('').addHandler(console)

logging.info("Starting design generation process")

# Verify PlantUML JAR exists
PLANTUML_JAR_PATH = 'C:\\plantuml\\plantuml.jar'
if not os.path.isfile(PLANTUML_JAR_PATH):
    logging.error(f"PlantUML JAR not found at {PLANTUML_JAR_PATH}")
    raise FileNotFoundError(f"PlantUML JAR not found at {PLANTUML_JAR_PATH}. Please ensure it is installed.")

# Chrome options
chrome_options = Options()
user_data_dir = r"C:\Users\Irika\AppData\Local\Google\Chrome\User Data"  # Adjust to your user
profile_directory = "Default"
chrome_options.add_argument(f"--user-data-dir={user_data_dir}")
chrome_options.add_argument(f"--profile-directory={profile_directory}")

# Initialize driver
driver = webdriver.Chrome(options=chrome_options)
logging.info("Initialized Chrome driver")

def get_fresh_element(driver, by, value, timeout=20, max_retries=3):
    for attempt in range(max_retries):
        try:
            element = WebDriverWait(driver, timeout).until(
                EC.element_to_be_clickable((by, value))
            )
            if element.is_displayed() and element.is_enabled():
                driver.execute_script("arguments[0].scrollIntoView(true);", element)
                element.click()
                logging.info(f"Located and focused element: {value}")
                return element
            raise TimeoutException("Element not interactable")
        except TimeoutException:
            logging.warning(f"Retry {attempt + 1}/{max_retries} for element {value}")
            if attempt == max_retries - 1:
                logging.error(f"Failed to locate interactable element: {value}")
                return None
            time.sleep(2)
    return None

def check_for_login_page(driver):
    if "login" in driver.current_url.lower():
        logging.warning("Detected login page. Manual login required.")
        print("Login page detected. Please log in manually, then press Enter...")
        input("Press Enter after logging in...")
        WebDriverWait(driver, 20).until(
            lambda d: "grok" in d.current_url.lower()
        )
        logging.info("Redirected to Grok Chat UI after login")

def wait_for_copy_text_button(driver, prompt_count, max_wait=120):
    start_time = time.time()
    last_log_time = start_time
    while time.time() - start_time < max_wait:
        try:
            buttons = driver.find_elements(By.XPATH, "//button[@aria-label]")
            copy_text_buttons = [btn for btn in buttons if "copy text" in btn.get_attribute("aria-label").lower()]
            if len(copy_text_buttons) >= prompt_count:
                logging.info(f"Found {len(copy_text_buttons)} Copy text buttons, matches or exceeds prompt count {prompt_count}")
                return copy_text_buttons[prompt_count - 1]
            current_time = time.time()
            if current_time - last_log_time >= 10:  # Log every 10 seconds
                logging.info(f"Found {len(copy_text_buttons)} Copy text buttons, waiting for {prompt_count}")
                last_log_time = current_time
            time.sleep(1)
        except StaleElementReferenceException:
            logging.warning("Stale element in button check, retrying")
            time.sleep(1)
    logging.error("Copy text button not found within max wait time")
    return None

def send_prompt_and_get_plantuml(driver, prompt, prompt_count):
    text_input = get_fresh_element(driver, By.XPATH, "//textarea[@placeholder='Ask anything']")
    if not text_input:
        raise Exception("Text input field not found")

    logging.info(f"Sending prompt: {prompt[:100]}...")
    text_input.clear()
    prompt_parts = prompt.split("\n")
    for i, part in enumerate(prompt_parts):
        text_input.send_keys(part)
        if i < len(prompt_parts) - 1:
            text_input.send_keys(Keys.SHIFT + Keys.RETURN)
    text_input.send_keys(Keys.RETURN)
    logging.info("Prompt submitted")

    try:
        WebDriverWait(driver, 30).until(
            EC.presence_of_element_located((By.XPATH, "//div[contains(@class, 'r-a8ghvy')]"))
        )
        logging.info("Chat message detected")
    except TimeoutException:
        logging.error("Prompt verification timed out")
        raise

    copy_button = wait_for_copy_text_button(driver, prompt_count)
    if not copy_button:
        raise Exception("Failed to locate Copy text button")

    pyperclip.copy("")
    driver.execute_script("arguments[0].scrollIntoView(true);", copy_button)
    copy_button.click()
    time.sleep(3)
    response = pyperclip.paste()

    plantuml_pattern = r"(?:```plantuml\s*|plantuml\s*)(.*?)(?:```|\Z)"
    match = re.search(plantuml_pattern, response, re.DOTALL)
    if match:
        plantuml_code = match.group(1).strip()
        logging.info(f"Extracted PlantUML code length: {len(plantuml_code)} chars")
        return plantuml_code
    else:
        logging.error(f"No PlantUML code found in response: {response[:200]}...")
        raise Exception("No PlantUML code found in response")

def render_plantuml(plantuml_code, output_file):
    puml_file = f"{output_file}.puml"
    with open(puml_file, 'w', encoding='utf-8') as f:
        f.write("@startuml\n")
        f.write(plantuml_code)
        f.write("\n@enduml")
    
    cmd = ['java', '-jar', PLANTUML_JAR_PATH, puml_file]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode == 0:
        logging.info(f"Rendered PlantUML diagram to {output_file}.png")
    else:
        logging.error(f"PlantUML rendering failed: {result.stderr}")
        raise Exception("PlantUML rendering failed")

try:
    driver.get("https://x.com/i/grok")
    logging.info("Opened Grok Chat UI")
    check_for_login_page(driver)
    
    WebDriverWait(driver, 20).until(
        EC.presence_of_element_located((By.XPATH, "//textarea[@placeholder='Ask anything']"))
    )

    with open("analyzed_requirements.txt", "r", encoding="utf-8") as f:
        content = f.read().strip()
        sections = re.split(r"(Issue #\d+:.*?)\n(?:Analysis:)?", content, flags=re.DOTALL)
        requirements = []
        for i in range(1, len(sections), 2):
            req = sections[i].strip()
            analysis = sections[i + 1].strip() if i + 1 < len(sections) else ""
            if req.startswith("Issue #") and analysis:
                logging.info(f"Parsed requirement: {req[:50]}... with analysis length: {len(analysis)}")
                requirements.append((req, analysis))
            else:
                logging.warning(f"Skipping malformed section: req='{req[:50]}...', analysis='{analysis[:50]}...'")

    if not requirements:
        raise Exception("No valid requirements found in analyzed_requirements.txt")

    prompt_count = 0
    for req, analysis in requirements:
        issue = req.split(":")[0].strip()
        prompt_count += 1
        logging.info(f"Generating design for {req}")
        prompt = f"Based on this analysis, generate PlantUML code for a UML class diagram:\n{analysis}"
        
        plantuml_code = send_prompt_and_get_plantuml(driver, prompt, prompt_count)
        output_file = f"D:\\Documents\\AutoSDLC\\designs\\{issue.replace('#', '').replace(' ', '_')}"
        render_plantuml(plantuml_code, output_file)
        print(f"Design diagram generated for '{req}' at {output_file}.png")

finally:
    if 'driver' in locals():
        time.sleep(2)
        driver.quit()
        logging.info("Browser closed")