# AutoSDLC Requirement Analysis Script

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
- Chat history: JSON files in `D:\Documents\AutoSDLC\Downloads`
- Logs: Timestamped files in `D:\Documents\AutoSDLC\logs`

## Dependencies
- Python 3.x
- selenium, pyperclip, requests, pytest
- Chrome browser with Grok Chat Exporter extension (optional)

## Notes
- Ensure you're logged into X/Grok before running.
- Logs are archived with timestamps for each run.
