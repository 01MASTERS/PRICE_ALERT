from app.scraper import get_price_and_name

def main():
    # Example Flipkart/Amazon URL (replace with a real, active product URL if desired)
    test_url = "https://www.flipkart.com/boat-rockerz-480-w-beast-mode-rgb-leds-6-light-modes-60hrs-playback-enx-tech-bluetooth/p/itm7362b8da6ff74?pid=ACCH44E526JMXHZN&lid=LSTACCH44E526JMXHZN5SOCIA&hl_lid=&marketplace=FLIPKART&fm=eyJ3dHAiOiJyZWNvIiwicHJwdCI6ImhwIiwibWlkIjoicGVyc29uYWxpc2VkUmVjb21tZW5kYXRpb24vcDJwLXNhbWUifQ%3D%3D&pageUID=1779900004485"
    
    print(f"Testing scraper with URL:\n{test_url}\n")
    
    price, name = get_price_and_name(test_url)
    
    print("\n--- Scraper Results ---")
    print(f"Product Name: {name}")
    print(f"Current Price: {price}")

if __name__ == "__main__":
    main()
