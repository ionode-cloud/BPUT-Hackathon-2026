"""Skill taxonomy, synonym normalisation, target-role profiles and learning resources.

This is the shared vocabulary used by the JD parser, readiness engine,
skill-gap analyser and matching engine.
"""
from __future__ import annotations

import re

# canonical skill -> category
SKILL_CATEGORY: dict[str, str] = {
    # programming
    "python": "programming", "java": "programming", "c++": "programming", "c": "programming",
    "javascript": "programming", "typescript": "programming", "go": "programming",
    # cs core
    "data structures": "cs core", "algorithms": "cs core", "dbms": "cs core",
    "operating systems": "cs core", "computer networks": "cs core", "oops": "cs core",
    # web
    "react": "web", "node.js": "web", "html/css": "web", "django": "web", "spring boot": "web",
    "rest api": "web",
    # data / ai
    "sql": "data", "machine learning": "ai/ml", "deep learning": "ai/ml", "nlp": "ai/ml",
    "pandas": "data", "power bi": "data", "excel": "data", "statistics": "data",
    "tensorflow": "ai/ml", "pytorch": "ai/ml", "generative ai": "ai/ml",
    # cloud / devops
    "aws": "cloud", "azure": "cloud", "gcp": "cloud", "docker": "cloud", "kubernetes": "cloud",
    "linux": "cloud", "ci/cd": "cloud", "git": "tools",
    # embedded / electronics
    "embedded c": "embedded", "microcontrollers": "embedded", "iot": "embedded", "rtos": "embedded",
    "pcb design": "electronics", "vlsi": "electronics", "verilog": "electronics",
    "matlab": "electronics", "plc": "electrical", "power systems": "electrical",
    # mechanical / civil
    "autocad": "design", "solidworks": "design", "ansys": "design", "cad/cam": "design",
    "thermodynamics": "mechanical", "manufacturing": "mechanical", "staad pro": "civil",
    "project management": "management",
    # security / testing
    "cyber security": "security", "selenium": "testing", "manual testing": "testing",
}

SYNONYMS: dict[str, str] = {
    "py": "python", "python3": "python", "cpp": "c++", "js": "javascript", "ts": "typescript",
    "golang": "go", "dsa": "data structures", "data structure": "data structures",
    "algorithm": "algorithms", "os": "operating systems", "cn": "computer networks",
    "networking": "computer networks", "oop": "oops", "object oriented programming": "oops",
    "reactjs": "react", "react.js": "react", "nodejs": "node.js", "node": "node.js",
    "express": "node.js", "html": "html/css", "css": "html/css", "restful": "rest api",
    "rest": "rest api", "apis": "rest api", "springboot": "spring boot", "spring": "spring boot",
    "mysql": "sql", "postgresql": "sql", "postgres": "sql", "ml": "machine learning",
    "dl": "deep learning", "natural language processing": "nlp", "llm": "generative ai",
    "llms": "generative ai", "genai": "generative ai", "gen ai": "generative ai",
    "powerbi": "power bi", "tableau": "power bi", "ms excel": "excel", "stats": "statistics",
    "amazon web services": "aws", "microsoft azure": "azure", "google cloud": "gcp",
    "k8s": "kubernetes", "devops": "ci/cd", "jenkins": "ci/cd", "github": "git",
    "arduino": "microcontrollers", "stm32": "microcontrollers", "esp32": "microcontrollers",
    "8051": "microcontrollers", "internet of things": "iot", "freertos": "rtos",
    "altium": "pcb design", "kicad": "pcb design", "fpga": "verilog", "vhdl": "verilog",
    "simulink": "matlab", "scada": "plc", "catia": "solidworks", "creo": "solidworks",
    "fea": "ansys", "cnc": "cad/cam", "staad": "staad pro", "security": "cyber security",
    "automation testing": "selenium", "testing": "manual testing",
}

# Target job roles with weighted skill requirements (weights sum ~1)
ROLE_PROFILES: dict[str, dict] = {
    "Software Engineer": {"skills": {"data structures": .2, "algorithms": .15, "java": .1, "python": .1,
                           "oops": .1, "dbms": .1, "operating systems": .05, "git": .05, "sql": .1,
                           "computer networks": .05}, "branches": ["CSE", "IT", "ECE"]},
    "Full Stack Developer": {"skills": {"javascript": .2, "react": .2, "node.js": .15, "html/css": .1,
                              "rest api": .1, "sql": .1, "git": .05, "docker": .05, "typescript": .05},
                             "branches": ["CSE", "IT"]},
    "Data Scientist": {"skills": {"python": .2, "machine learning": .2, "statistics": .15, "sql": .1,
                        "pandas": .1, "deep learning": .1, "nlp": .05, "power bi": .05,
                        "generative ai": .05}, "branches": ["CSE", "IT", "ECE", "EEE"]},
    "Cloud / DevOps Engineer": {"skills": {"aws": .2, "linux": .15, "docker": .15, "kubernetes": .15,
                                 "ci/cd": .1, "python": .1, "computer networks": .1, "git": .05},
                                "branches": ["CSE", "IT", "ECE"]},
    "Embedded Systems Engineer": {"skills": {"embedded c": .25, "microcontrollers": .2, "rtos": .15,
                                   "c": .1, "iot": .1, "pcb design": .1, "linux": .05, "python": .05},
                                  "branches": ["ECE", "EEE", "CSE"]},
    "VLSI Design Engineer": {"skills": {"verilog": .35, "vlsi": .35, "c": .1, "matlab": .1, "python": .1},
                             "branches": ["ECE", "EEE"]},
    "Business / Data Analyst": {"skills": {"sql": .25, "excel": .2, "power bi": .2, "statistics": .15,
                                 "python": .1, "pandas": .1}, "branches": ["CSE", "IT", "ECE", "EEE", "MECH", "CIVIL"]},
    "Mechanical Design Engineer": {"skills": {"solidworks": .25, "autocad": .2, "ansys": .2,
                                    "thermodynamics": .15, "manufacturing": .1, "cad/cam": .1},
                                   "branches": ["MECH"]},
    "Electrical Engineer": {"skills": {"power systems": .3, "plc": .25, "matlab": .2, "autocad": .1,
                             "microcontrollers": .15}, "branches": ["EEE"]},
    "Civil / Site Engineer": {"skills": {"autocad": .3, "staad pro": .3, "project management": .2,
                               "excel": .2}, "branches": ["CIVIL"]},
    "QA / Test Engineer": {"skills": {"manual testing": .25, "selenium": .25, "java": .15, "python": .1,
                            "sql": .15, "git": .1}, "branches": ["CSE", "IT", "ECE"]},
}

# skill -> (learning resource, suggested certification)
RESOURCES: dict[str, tuple[str, str]] = {
    "aws": ("AWS Skill Builder – Cloud Practitioner Essentials", "AWS Certified Cloud Practitioner"),
    "azure": ("Microsoft Learn – AZ-900 path", "Microsoft Azure Fundamentals (AZ-900)"),
    "gcp": ("Google Cloud Skills Boost", "Google Associate Cloud Engineer"),
    "docker": ("Docker 101 hands-on labs", "Docker Certified Associate"),
    "kubernetes": ("Kubernetes Basics (kubernetes.io)", "CKAD"),
    "data structures": ("NPTEL – Programming, DS & Algorithms", "NPTEL DSA Elite"),
    "algorithms": ("LeetCode 75 study plan", "NPTEL Design & Analysis of Algorithms"),
    "machine learning": ("NPTEL – Introduction to Machine Learning", "Google ML Crash Course"),
    "deep learning": ("fast.ai Practical Deep Learning", "DeepLearning.AI Specialization"),
    "sql": ("SQLBolt + HackerRank SQL track", "HackerRank SQL (Advanced)"),
    "react": ("react.dev official tutorial", "Meta Front-End Developer"),
    "javascript": ("javascript.info", "freeCodeCamp JS Algorithms"),
    "python": ("NPTEL – The Joy of Computing using Python", "PCEP / PCAP"),
    "java": ("NPTEL – Programming in Java", "Oracle Java SE Associate"),
    "embedded c": ("NPTEL – Embedded Systems Design", "ARM Accredited Engineer"),
    "rtos": ("FreeRTOS kernel tutorials", "—"),
    "verilog": ("HDLBits practice", "NPTEL Digital VLSI Design"),
    "power bi": ("Microsoft Learn – PL-300 path", "Microsoft Power BI Data Analyst"),
    "statistics": ("Khan Academy Statistics", "NPTEL Statistics for Data Science"),
    "solidworks": ("SolidWorks Tutorials", "CSWA"),
    "ansys": ("Ansys Innovation Courses", "Ansys Certification"),
    "linux": ("Linux Journey", "LFCA"),
    "excel": ("Microsoft Learn – Excel for data analysis", "Microsoft Office Specialist: Excel"),
    "pandas": ("Kaggle Learn – Pandas micro-course", "Kaggle Pandas certificate"),
    "oops": ("NPTEL – Object Oriented Programming", "—"),
    "dbms": ("NPTEL – Database Management Systems", "NPTEL DBMS"),
    "git": ("Pro Git book + GitHub Skills", "GitHub Foundations"),
    "autocad": ("Autodesk Design Academy", "AutoCAD Certified User"),
    "node.js": ("nodejs.dev learning path", "OpenJS Node.js Application Developer"),
    "ci/cd": ("GitHub Actions / Jenkins tutorials", "—"),
    "generative ai": ("DeepLearning.AI short courses", "Google Generative AI Learning Path"),
}

_PATTERN_CACHE: list[tuple[re.Pattern, str]] | None = None


def normalise(skill: str) -> str | None:
    s = skill.strip().lower()
    s = SYNONYMS.get(s, s)
    return s if s in SKILL_CATEGORY else None


def _patterns() -> list[tuple[re.Pattern, str]]:
    global _PATTERN_CACHE
    if _PATTERN_CACHE is None:
        terms = {**{k: k for k in SKILL_CATEGORY}, **SYNONYMS}
        pats = []
        for term, canon in sorted(terms.items(), key=lambda kv: -len(kv[0])):
            if term in ("c", "go", "os", "cn", "ml", "dl", "js", "ts", "py", "rest", "node", "spring"):
                # ambiguous short tokens: require exact token with boundaries & case
                if len(term) > 2:
                    alt = re.escape(term)
                    flags = re.I
                else:  # 'C', 'Go', 'OS', 'ML' ... only in their written-out case
                    alt = f"{re.escape(term.upper())}|{re.escape(term.capitalize())}" if term == "go" else re.escape(term.upper())
                    flags = 0
                pats.append((re.compile(rf"(?<![\w+#/.])(?:{alt})(?![\w+#/])", flags), canon))
            else:
                pats.append((re.compile(rf"(?<![\w]){re.escape(term)}(?![\w])", re.I), canon))
        _PATTERN_CACHE = pats
    return _PATTERN_CACHE


def extract_skills(text: str) -> list[str]:
    """Dictionary + regex NER for skills. Short ambiguous tokens are only matched
    in upper case (e.g. 'C', 'OS', 'ML') to avoid false positives."""
    found: list[str] = []
    for pat, canon in _patterns():
        if pat.search(text) and canon not in found:
            found.append(canon)
    return found


def category_of(skill: str) -> str:
    return SKILL_CATEGORY.get(skill, "other")
