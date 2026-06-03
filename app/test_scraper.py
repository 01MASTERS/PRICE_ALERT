from scraper import get_price_and_name

url = input("Enter Flipkart URL: ").strip()

price, name = get_price_and_name(url)

print(f"Name : {name}")
print(f"Price: {price}")