
import requests

access_key = "7wbnkd5ehenf4wn37e3be6"

def test_homepage():
    try:
        response = requests.get("https://harvesthealth-deep-research.hf.space")
        print(f"GET /: {response.status_code}")
    except Exception as e:
        print(f"GET /: Error {e}")

def test_sse_endpoint():
    print(f"--- Testing SSE Auth Variations ---")

    scenarios = [
        ("No Auth", {}),
        ("Bearer Token", {"Authorization": f"Bearer {access_key}"}),
        ("Token Only", {"Authorization": f"{access_key}"}),
        ("X-API-KEY", {"X-API-KEY": access_key}),
        ("x-api-key", {"x-api-key": access_key}),
        ("api-key", {"api-key": access_key}),
        ("Cookie", {"Cookie": f"access_token={access_key}"})
    ]

    for name, headers in scenarios:
        try:
            # Add Content-Type to match expected API behavior sometimes
            if "Content-Type" not in headers:
                headers["Content-Type"] = "application/json"

            response = requests.get("https://harvesthealth-deep-research.hf.space/api/sse/live", headers=headers, timeout=5)
            print(f"Header '{name}': {response.status_code}")
            if response.status_code != 403 and response.status_code != 500:
                print(f"  > Unexpected Status! Body preview: {response.text[:100]}")
        except Exception as e:
            print(f"Header '{name}': Error {e}")

    # Query Param Test
    try:
        response = requests.get(f"https://harvesthealth-deep-research.hf.space/api/sse/live?token={access_key}", timeout=5)
        print(f"Query Param 'token': {response.status_code}")
    except Exception as e:
        print(f"Query Param 'token': Error {e}")

    try:
        response = requests.get(f"https://harvesthealth-deep-research.hf.space/api/sse/live?key={access_key}", timeout=5)
        print(f"Query Param 'key': {response.status_code}")
    except Exception as e:
        print(f"Query Param 'key': Error {e}")


if __name__ == "__main__":
    test_homepage()
    test_sse_endpoint()
