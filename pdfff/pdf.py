import re
import fitz  
from typing import List, Dict

def extract_text_from_pdf(pdf_path: str) -> str:
    """Extract all text from a PDF file."""
    text = ""
    with fitz.open(pdf_path) as doc:
        for page in doc:
            text += page.get_text()
    return text


def split_into_chapters(text: str) -> Dict[str, str]:
    """
    Split text into chapters using regex and heuristic cues.
    Returns a dict: {chapter_title: chapter_text}.
    """
    # Common chapter heading patterns - captures title and content together
    pattern = r'(CHAPTER\s+[A-Z0-9IVX]+.*?)(?=\n\s*CHAPTER\s+[A-Z0-9IVX]+|\Z)'
    
    chapters = re.findall(pattern, text, flags=re.DOTALL | re.IGNORECASE)
    chapter_dict = {}
    
    for i, chapter in enumerate(chapters, start=1):
        # Extract the first line as title
        lines = chapter.strip().split('\n')
        title = lines[0].strip() if lines else f"Chapter_{i}"
        
        # Include the title as part of the content
        chapter_dict[title] = chapter.strip()
    
    # Fallback if no chapters found
    if not chapter_dict:
        chapter_dict = {f"Chunk_{i}": part for i, part in enumerate(text.split("\n\n"), start=1)}
    
    return chapter_dict


def save_chapters_to_files(chapters: Dict[str, str], output_dir: str = "./chapters"):
    """Save each chapter into a separate text file."""
    import os
    os.makedirs(output_dir, exist_ok=True)
    
    for title, content in chapters.items():
        safe_title = re.sub(r'[^A-Za-z0-9]+', '_', title)
        with open(f"{output_dir}/{safe_title}.txt", "w", encoding="utf-8") as f:
            f.write(content)


def copy_chapter_text(chapter_title: str, chapters: Dict[str, str]) -> str:
    """
    Return (copy) the full text of a given chapter.
    Example usage: print(copy_chapter_text("CHAPTER 5", chapters))
    """
    for title, content in chapters.items():
        if chapter_title.lower() in title.lower():
            return content
    raise ValueError(f"Chapter titled '{chapter_title}' not found.")


if __name__ == "__main__":
    pdf_path = "atlas.pdf"
    text = extract_text_from_pdf(pdf_path)
    chapters = split_into_chapters(text)
    save_chapters_to_files(chapters)
    
    # Example: Copy one chapter's text
    selected = copy_chapter_text("Chapter II", chapters)
    print(selected[:500])  # print preview
