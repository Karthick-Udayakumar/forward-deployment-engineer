import requests

URL = "https://jsonplaceholder.typicode.com/users"

response = requests.get(URL)

data = response.json()

for user in data:
    name = user['name']
    email = user['email']
    company_name = user['company']['name']
    extensions = user['phone'].split('x')

    for extension in extensions:
        if extension[1] > 1:
            extension_value = extension[1]
            print(f"User Name: {name:<25} | Email: {email:<30} | Company: {company_name:<25}")
