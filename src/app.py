import requests
from bs4 import BeautifulSoup
import openai
from typing import List, Dict
import os
import json
import datetime
import pytz
import logging
import urllib.request
import time
import re
import tqdm
import sys
import json
from colorama import Fore, Style, init

# Initialize colorama
init(autoreset=True)

ARXIV_URL = "https://arxiv.org/list/{}/new"

# Define topics and their corresponding abbreviations
topics = {
    "Physics": "",
    "Mathematics": "math",
    "Computer Science": "cs",
    "Quantitative Biology": "q-bio",
    "Quantitative Finance": "q-fin",
    "Statistics": "stat",
    "Electrical Engineering and Systems Science": "eess",
    "Economics": "econ"
}

# Define physics subtopics and their corresponding abbreviations
physics_topics = {
    "Astrophysics": "astro-ph",
    "Condensed Matter": "cond-mat",
    "General Relativity and Quantum Cosmology": "gr-qc",
    "High Energy Physics - Experiment": "hep-ex",
    "High Energy Physics - Lattice": "hep-lat",
    "High Energy Physics - Phenomenology": "hep-ph",
    "High Energy Physics - Theory": "hep-th",
    "Mathematical Physics": "math-ph",
    "Nonlinear Sciences": "nlin",
    "Nuclear Experiment": "nucl-ex",
    "Nuclear Theory": "nucl-th",
    "Physics": "physics",
    "Quantum Physics": "quant-ph"
}

# Define categories for each topic and subtopic
categories_map = {
    "Astrophysics": ["Astrophysics of Galaxies", "Cosmology and Nongalactic Astrophysics", "Earth and Planetary Astrophysics", "High Energy Astrophysical Phenomena", "Instrumentation and Methods for Astrophysics", "Solar and Stellar Astrophysics"],
    "Condensed Matter": ["Disordered Systems and Neural Networks", "Materials Science", "Mesoscale and Nanoscale Physics", "Other Condensed Matter", "Quantum Gases", "Soft Condensed Matter", "Statistical Mechanics", "Strongly Correlated Electrons", "Superconductivity"],
    "General Relativity and Quantum Cosmology": ["None"],
    "High Energy Physics - Experiment": ["None"],
    "High Energy Physics - Lattice": ["None"],
    "High Energy Physics - Phenomenology": ["None"],
    "High Energy Physics - Theory": ["None"],
    "Mathematical Physics": ["None"],
    "Nonlinear Sciences": ["Adaptation and Self-Organizing Systems", "Cellular Automata and Lattice Gases", "Chaotic Dynamics", "Exactly Solvable and Integrable Systems", "Pattern Formation and Solitons"],
    "Nuclear Experiment": ["None"],
    "Nuclear Theory": ["None"],
    "Physics": ["Accelerator Physics", "Applied Physics", "Atmospheric and Oceanic Physics", "Atomic and Molecular Clusters", "Atomic Physics", "Biological Physics", "Chemical Physics", "Classical Physics", "Computational Physics", "Data Analysis, Statistics and Probability", "Fluid Dynamics", "General Physics", "Geophysics", "History and Philosophy of Physics", "Instrumentation and Detectors", "Medical Physics", "Optics", "Physics and Society", "Physics Education", "Plasma Physics", "Popular Physics", "Space Physics"],
    "Quantum Physics": ["None"],
    "Mathematics": ["Algebraic Geometry", "Algebraic Topology", "Analysis of PDEs", "Category Theory", "Classical Analysis and ODEs", "Combinatorics", "Commutative Algebra", "Complex Variables", "Differential Geometry", "Dynamical Systems", "Functional Analysis", "General Mathematics", "General Topology", "Geometric Topology", "Group Theory", "History and Overview", "Information Theory", "K-Theory and Homology", "Logic", "Mathematical Physics", "Metric Geometry", "Number Theory", "Numerical Analysis", "Operator Algebras", "Optimization and Control", "Probability", "Quantum Algebra", "Representation Theory", "Rings and Algebras", "Spectral Theory", "Statistics Theory", "Symplectic Geometry"],
    "Computer Science": ["Artificial Intelligence", "Computation and Language", "Computational Complexity", "Computational Engineering, Finance, and Science", "Computational Geometry", "Computer Science and Game Theory", "Computer Vision and Pattern Recognition", "Computers and Society", "Cryptography and Security", "Data Structures and Algorithms", "Databases", "Digital Libraries", "Discrete Mathematics", "Distributed, Parallel, and Cluster Computing", "Emerging Technologies", "Formal Languages and Automata Theory", "General Literature", "Graphics", "Hardware Architecture", "Human-Computer Interaction", "Information Retrieval", "Information Theory", "Logic in Computer Science", "Machine Learning", "Mathematical Software", "Multiagent Systems", "Multimedia", "Networking and Internet Architecture", "Neural and Evolutionary Computing", "Numerical Analysis", "Operating Systems", "Other Computer Science", "Performance", "Programming Languages", "Robotics", "Social and Information Networks", "Software Engineering", "Sound", "Symbolic Computation", "Systems and Control"],
    "Quantitative Biology": ["Biomolecules", "Cell Behavior", "Genomics", "Molecular Networks", "Neurons and Cognition", "Other Quantitative Biology", "Populations and Evolution", "Quantitative Methods", "Subcellular Processes", "Tissues and Organs"],
    "Quantitative Finance": ["Computational Finance", "Economics", "General Finance", "Mathematical Finance", "Portfolio Management", "Pricing of Securities", "Risk Management", "Statistical Finance", "Trading and Market Microstructure"],
    "Statistics": ["Applications", "Computation", "Machine Learning", "Methodology", "Other Statistics", "Statistics Theory"],
    "Electrical Engineering and Systems Science": ["Audio and Speech Processing", "Image and Video Processing", "Signal Processing", "Systems and Control"],
    "Economics": ["Econometrics", "General Economics", "Theoretical Economics"]
}


class Paper:
    def __init__(self, title: str, abstract: str, url: str, authors: str, subjects: str, pdf_url: str):
        self.title = title
        self.abstract = abstract
        self.url = url
        self.authors = authors
        self.subjects = subjects
        self.pdf_url = pdf_url
        self.relevancy_score = None
        self.reasons_for_match = None

    def __repr__(self):
        return f"Paper(title='{self.title}', authors='{self.authors}', url='{self.url}', subjects='{self.subjects}')"

    def update(self, data: Dict):
        self.relevancy_score = data.get("Relevancy score")
        self.reasons_for_match = data.get("Reasons for match")
    
class PapersParser:
    @staticmethod
    def parse(topic: str) -> List[Paper]:
        logging.info(f"{Fore.CYAN}Parsing papers for topic: {topic}{Style.RESET_ALL}")
        field_abbr = topics.get(topic, "") or physics_topics.get(topic, "")
        if not field_abbr:
            logging.error(f"{Fore.RED}Invalid topic: {topic}{Style.RESET_ALL}")
            return []

        NEW_SUB_URL = ARXIV_URL.format(field_abbr)
        logging.info(f"{Fore.CYAN}Fetching papers from URL: {NEW_SUB_URL}{Style.RESET_ALL}")
        try:
            page = urllib.request.urlopen(NEW_SUB_URL)
            soup = BeautifulSoup(page, 'html.parser')
        except urllib.error.URLError as e:
            logging.error(f"{Fore.RED}Failed to open URL: {NEW_SUB_URL}. Error: {str(e)}{Style.RESET_ALL}")
            return []

        content = soup.body.find("div", {'id': 'content'})
        logging.info(f"{Fore.CYAN}Content from ARXIV URL: {content}{Style.RESET_ALL}")
        if not content:
            logging.error(f"{Fore.RED}Failed to find content div{Style.RESET_ALL}")
            return []

        dl = content.find('dl')
        if not dl:
            logging.error(f"{Fore.RED}Failed to find dl element{Style.RESET_ALL}")
            return []

        dt_list = dl.find_all("dt")
        dd_list = dl.find_all("dd")
        if len(dt_list) != len(dd_list):
            logging.error(f"{Fore.RED}Mismatch between number of titles ({len(dt_list)}) and details ({len(dd_list)}){Style.RESET_ALL}")
            return []

        papers = []
        for dt, dd in zip(dt_list, dd_list):
            arxiv_id = dt.find('a', {'title': 'Abstract'}).text.strip().split(':')[-1]
            url = f"https://arxiv.org/abs/{arxiv_id}"
            pdf_url = f"https://arxiv.org/pdf/{arxiv_id}"

            title_div = dd.find("div", {"class": "list-title mathjax"})
            title = title_div.text.replace("Title: ", "").strip() if title_div else ""

            authors_div = dd.find("div", {"class": "list-authors"})
            authors = authors_div.text.replace("Authors:\n", "").replace("\n", "").strip() if authors_div else ""

            subjects_div = dd.find("div", {"class": "list-subjects"})
            paper_subjects = subjects_div.text.replace("Subjects: ", "").strip().split('; ') if subjects_div else []

            abstract_p = dd.find("p", {"class": "mathjax"})
            abstract = abstract_p.text.replace("\n", " ").strip() if abstract_p else ""

            paper = Paper(title, abstract, url, authors, '; '.join(paper_subjects), pdf_url)
            papers.append(paper)
            logging.info(f"{Fore.GREEN}Parsed paper: {paper}{Style.RESET_ALL}")

        logging.info(f"{Fore.CYAN}Found {len(papers)} papers in total{Style.RESET_ALL}")
        return papers[0:20]

    @staticmethod
    def filter(papers: List[Paper], subjects: List[str]) -> List[Paper]:
        logging.info(f"{Fore.CYAN}Filtering papers based on subjects: {subjects}{Style.RESET_ALL}")
        filtered_papers = []
        for paper in papers:
            if any(any(user_subject.lower() in paper_subject.lower() for paper_subject in paper.subjects.split('; ')) for user_subject in subjects):
                filtered_papers.append(paper)
                logging.info(f"{Fore.GREEN}Paper matched criteria: {paper}{Style.RESET_ALL}")
            else:
                logging.info(f"{Fore.YELLOW}Paper does not match criteria: {paper}{Style.RESET_ALL}")
        
        logging.info(f"{Fore.CYAN}Found {len(filtered_papers)} papers matching the criteria{Style.RESET_ALL}")
        return filtered_papers

    @staticmethod
    def parse_and_filter(topic: str, subjects: List[str]) -> List[Paper]:
        all_papers = PapersParser.parse(topic)
        filtered_papers = PapersParser.filter(all_papers, subjects)
        return filtered_papers

class PapersRanker:
    @staticmethod
    def encode_prompt(query, prompt_papers):
        logging.info(f"{Fore.CYAN}Encoding prompt for {len(prompt_papers)} papers{Style.RESET_ALL}")
        # Use absolute path to find the relevancy_prompt.txt file
        prompt_file_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'relevancy_prompt.txt')
        try:
            with open(prompt_file_path, 'r') as f:
                prompt = f.read() + "\n"
        except FileNotFoundError:
            logging.error(f"{Fore.RED}relevancy_prompt.txt not found at {prompt_file_path}{Style.RESET_ALL}")
            # Provide a default prompt or raise an error
            prompt = "Please analyze the following papers and provide a relevancy score (1-10) and reasons for the match:\n\n"

        prompt += query['interest']

        for idx, paper in enumerate(prompt_papers):
            prompt += f"###\n"
            prompt += f"{idx + 1}. Title: {paper.title}\n"
            prompt += f"{idx + 1}. Authors: {paper.authors}\n"
            prompt += f"{idx + 1}. Abstract: {paper.abstract}\n"
        prompt += f"\n Generate response:\n1."
        logging.info(f"{Fore.CYAN}Encoded prompt length: {len(prompt)}{Style.RESET_ALL}")
        return prompt

    @staticmethod
    def post_process_response(paper_data, response, threshold_score=0):
        logging.info(f"{Fore.CYAN}Post-processing API response{Style.RESET_ALL}")
        selected_data = []
        if response is None:
            logging.warning(f"{Fore.YELLOW}Received null response{Style.RESET_ALL}")
            return []
        json_items = response.message.content.replace("\n\n", "\n").split("\n")
        pattern = r"^\d+\. |\\"
        try:
            score_items = [
                json.loads(re.sub(pattern, "", line))
                for line in json_items if "relevancy score" in line.lower()]
        except Exception as e:
            logging.error(f"{Fore.RED}Failed to parse response: {e}{Style.RESET_ALL}")
            raise RuntimeError("Failed to parse response") from e

        scores = []
        for item in score_items:
            temp = item["Relevancy score"]
            if isinstance(temp, str) and "/" in temp:
                scores.append(int(temp.split("/")[0]))
            else:
                scores.append(int(temp))

        for idx, inst in enumerate(score_items):
            if scores[idx] < threshold_score:
                continue
            paper_data[idx].update(inst)
            selected_data.append(paper_data[idx])
        logging.info(f"{Fore.CYAN}Selected {len(selected_data)} papers after post-processing{Style.RESET_ALL}")
        return selected_data

    @staticmethod
    def rank(papers: List[Paper], query: Dict, api_key: str, model_name="Meta-Llama-3.1-8B-Instruct", threshold_score=0, num_paper_in_prompt=4, temperature=0.4, top_p=1.0) -> List[Paper]:
        logging.info(f"{Fore.CYAN}Ranking {len(papers)} papers{Style.RESET_ALL}")
        
        ranked_papers = []
        for i in tqdm.tqdm(range(0, len(papers), num_paper_in_prompt)):
            prompt_papers = papers[i:i+num_paper_in_prompt]
            prompt = PapersRanker.encode_prompt(query, prompt_papers)
            
            logging.info(f"{Fore.CYAN}Sending request to OpenAI API for batch {i//num_paper_in_prompt + 1}{Style.RESET_ALL}")
            
            #TODO: add generic fix to make it work with both API keys
            use_sambanova = len(api_key) <= 37
            if use_sambanova == True:
                client = openai.OpenAI(api_key=api_key, base_url="https://api.sambanova.ai/v1")
                model_name = "Meta-Llama-3.1-405B-Instruct"
            else:
                client = openai.OpenAI(api_key=api_key)
                model_name = "gpt-3.5-turbo-16k"

            response = client.chat.completions.create(
                model=model_name,
                messages=[{"role": "user", "content": prompt}],
                temperature=temperature,
                top_p=top_p,
                n=1,
                max_tokens=128*num_paper_in_prompt,
            )
            logging.info(f"{Fore.CYAN}Received response from OpenAI API for batch {i//num_paper_in_prompt + 1}{Style.RESET_ALL}")
            batch_data = PapersRanker.post_process_response(prompt_papers, response.choices[0], threshold_score)
            ranked_papers.extend(batch_data)

        logging.info(f"{Fore.CYAN}Ranked {len(ranked_papers)} papers{Style.RESET_ALL}")
        return sorted(ranked_papers, key=lambda x: int(x.relevancy_score) if x.relevancy_score is not None else 0, reverse=True)

def get_subjects(subject_input: str) -> List[str]:
    logging.info(f"{Fore.CYAN}Getting subjects from input: {subject_input}{Style.RESET_ALL}")
    all_subjects = [subject for sublist in categories_map.values() for subject in sublist if subject != "None"]
    input_subjects = subject_input[0].split(',')
    valid_subjects = []
    for input_subject in input_subjects:
        input_subject = input_subject.strip().lower()
        for subject in all_subjects:
            if input_subject in subject.lower():
                valid_subjects.append(subject)
                break
    valid_subjects = list(set(valid_subjects))
    logging.info(f"Valid subjects: {valid_subjects}")
    return valid_subjects

def final_clean(paper: Dict) -> Dict:
    paper['title'] = paper['title'].replace("Title:\n          ", "")
    paper['subjects'] = paper['subjects'].replace("Subjects:\n", "")
    return paper

def main(topic: str, subjects: List[str], interests: str, max_results: int, api_key: str) -> List[Dict]:
    logging.info(f"Starting main function with topic: {topic}, subjects: {subjects}, max_results: {max_results}")
    papers = PapersParser.parse_and_filter(topic, subjects)
    logging.info(f"Papers parsed: {len(papers)}")
    query = {
        "interest": f"Topic: {topic}\nSubjects: {', '.join(subjects)}\nInterests: {interests}\n",
        "subjects": subjects
    }
    ranked_papers = PapersRanker.rank(papers, query, api_key)
    logging.info(f"Papers after ranking: {len(ranked_papers)}")
    result = ranked_papers[:min(max_results, 10)]
    
    # Convert Paper objects to dictionaries and clean the data
    final_result = [
        final_clean({
            "title": paper.title,
            "abstract": paper.abstract,
            "url": paper.url,
            "authors": paper.authors,
            "subjects": paper.subjects,
            "pdf_url": paper.pdf_url,
            "relevancy_score": paper.relevancy_score,
            "reasons_for_match": paper.reasons_for_match
        })
        for paper in result
    ]
    logging.info(f"Final result contains {len(final_result)} papers")
    return final_result

if __name__ == "__main__":
    # Parse command-line arguments
    script_dir = os.path.dirname(os.path.abspath(__file__))
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
    logging.info(f"Script directory: {script_dir}")
    logging.info("Logging initialized")
    topic = sys.argv[1]
    subjects = get_subjects([sys.argv[2]])  # Treat the entire subject as a single item
    interests = sys.argv[3]
    max_results = int(sys.argv[4])
    api_key = sys.argv[5]

    logging.info(f"Received inputs: topic={topic}, subjects={subjects}, interests={interests}, max_results={max_results}")
    result = main(topic, subjects, interests, max_results, api_key)
    logging.info("Writing final results to file")
    # Write results to a file
    results_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'results.json')
    with open(results_file, 'w') as f:
        json.dump(result, f)
    logging.info(f"Results written to {results_file}")