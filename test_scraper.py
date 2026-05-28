from app.scraper import get_price_and_name

def main():
    # Example Flipkart/Amazon URL (replace with a real, active product URL if desired)
    test_url = "https://www.flipkart.com/pepe-jeans-sneakers-men/p/itm21e7fae5c2b07?pid=SHOHDMHYQFHGZQFC&lid=LSTSHOHDMHYQFHGZQFCL7M7SD&marketplace=FLIPKART"
    
    print(f"Testing scraper with URL:\n{test_url}\n")
    
    price, name = get_price_and_name(test_url)
    
    print("\n--- Scraper Results ---")
    print(f"Product Name: {name}")
    print(f"Current Price: {price}")

if __name__ == "__main__":
    main()
