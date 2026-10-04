from pypdf import PdfReader

reader = PdfReader('data/Practice.pdf')

#pdf file -> Pages[Which one] -> extract_text

text = reader.pages[0].extract_text();

print(text)
