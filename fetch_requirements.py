import requests
import os

# Get GitHub token from environment variable
github_token = os.getenv("GITHUB_TOKEN")
if not github_token:
    raise ValueError("GitHub token not found. Set GITHUB_TOKEN environment variable.")

# GitHub repository details
repo = "sespear86/auto-sdlc"
headers = {"Authorization": f"token {github_token}"}

# Fetch issues
response = requests.get(f"https://api.github.com/repos/{repo}/issues", headers=headers)
if response.status_code != 200:
    raise Exception(f"Failed to fetch issues: {response.status_code} - {response.text}")

issues = response.json()
requirements = [f"Issue #{issue['number']}: {issue['title']}" for issue in issues]

# Save requirements to a file
with open("requirements.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(requirements))

print("Requirements fetched and saved to requirements.txt")