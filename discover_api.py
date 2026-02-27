from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    print("Navigating to https://harvesthealth-deep-research.hf.space...")
    try:
        page.goto("https://harvesthealth-deep-research.hf.space")
        page.wait_for_load_state("networkidle")
        print("Page loaded successfully.")

        # Check title
        title = page.title()
        print(f"Page Title: {title}")

        # Check topic input
        if page.locator("textarea[name='topic']").count() > 0:
             print("Research topic input field found.")
        else:
             print("Research topic input field NOT found.")

    except Exception as e:
        print(f"Error accessing page: {e}")
    finally:
        browser.close()

if __name__ == "__main__":
    with sync_playwright() as playwright:
        run(playwright)
