"""
Skills taxonomy — 250+ canonical skills across IT, data, marketing,
finance, design, healthcare, and operations domains, plus a rich
synonym/abbreviation graph for accurate matching.

All matching is done via SkillIndex, which precomputes lowercase
lookup tables and longest-first ordering so multi-word skills like
"Machine Learning" are matched before the unigram "learning".
"""

from __future__ import annotations

import re
from typing import Dict, List, Set, Tuple


# ---------------------------------------------------------------------------
# CANONICAL SKILLS BY CATEGORY
# ---------------------------------------------------------------------------

SKILLS_TAXONOMY: Dict[str, List[str]] = {
    "programming_languages": [
        "Python", "Java", "JavaScript", "TypeScript", "C", "C++", "C#",
        "Go", "Rust", "Ruby", "PHP", "Swift", "Kotlin", "Scala", "R",
        "MATLAB", "Perl", "Bash", "PowerShell", "Objective-C", "Dart",
        "Lua", "Groovy", "Apex", "VBA", "Assembly", "Haskell", "Erlang",
        "Elixir", "F#", "Julia", "Clojure", "SQL", "Solidity",
    ],
    "web_frontend": [
        "HTML", "CSS", "SASS", "LESS", "Tailwind CSS", "Bootstrap",
        "React", "Angular", "Vue.js", "Next.js", "Nuxt.js", "Svelte",
        "jQuery", "Redux", "MobX", "Webpack", "Vite", "Babel",
        "Material-UI", "Chakra UI", "Ant Design", "Three.js", "D3.js",
        "Storybook", "Remix", "Astro", "Solid.js",
    ],
    "web_backend": [
        "Node.js", "Express.js", "Django", "Flask", "FastAPI",
        "Spring Boot", "Spring Framework", "Ruby on Rails", "Laravel",
        "ASP.NET", ".NET Core", "NestJS", "Phoenix", "Gin",
        "GraphQL", "REST API", "SOAP", "gRPC", "WebSockets",
        "Microservices", "Serverless",
    ],
    "databases": [
        "MySQL", "PostgreSQL", "MongoDB", "Redis", "SQLite", "Oracle",
        "Microsoft SQL Server", "Cassandra", "DynamoDB", "Elasticsearch",
        "Neo4j", "MariaDB", "Firebase", "Firestore", "Realtime Database",
        "CouchDB", "HBase", "InfluxDB", "Snowflake", "BigQuery",
        "Redshift", "Supabase", "Couchbase", "Memcached",
    ],
    "cloud_platforms": [
        "AWS", "Azure", "Google Cloud Platform", "IBM Cloud", "Oracle Cloud",
        "Heroku", "DigitalOcean", "Linode", "Vercel", "Netlify",
        "Cloudflare", "Render", "Railway", "Fly.io",
    ],
    "aws_services": [
        "EC2", "S3", "Lambda", "RDS", "DynamoDB", "ECS", "EKS",
        "CloudFormation", "CloudFront", "Route 53", "API Gateway",
        "SQS", "SNS", "Kinesis", "Glue", "Athena", "EMR", "Sagemaker",
        "IAM", "VPC", "CloudWatch",
    ],
    "devops_tools": [
        "Docker", "Kubernetes", "Jenkins", "GitLab CI", "GitHub Actions",
        "CircleCI", "Travis CI", "Terraform", "Ansible", "Puppet", "Chef",
        "Vagrant", "Helm", "Prometheus", "Grafana", "ELK Stack", "Splunk",
        "Datadog", "New Relic", "Nagios", "ArgoCD", "Spinnaker",
        "Pulumi", "OpenTelemetry",
    ],
    "version_control": [
        "Git", "GitHub", "GitLab", "Bitbucket", "SVN", "Mercurial",
        "Perforce",
    ],
    "data_science_ml": [
        "Machine Learning", "Deep Learning", "Natural Language Processing",
        "Computer Vision", "Reinforcement Learning", "Data Analysis",
        "Data Visualization", "Statistical Analysis", "Predictive Modeling",
        "Time Series Analysis", "A/B Testing", "Feature Engineering",
        "Model Deployment", "MLOps", "Recommender Systems", "Clustering",
        "Classification", "Regression", "Neural Networks",
        "Convolutional Neural Networks", "Recurrent Neural Networks",
        "Transformers", "GANs", "Transfer Learning", "LLMs",
        "Prompt Engineering", "RAG", "Vector Databases",
    ],
    "ml_frameworks": [
        "TensorFlow", "PyTorch", "Keras", "scikit-learn", "XGBoost",
        "LightGBM", "CatBoost", "Hugging Face", "spaCy", "NLTK",
        "OpenCV", "Pandas", "NumPy", "SciPy", "Matplotlib", "Seaborn",
        "Plotly", "Statsmodels", "MLflow", "Kubeflow", "Weights & Biases",
        "DVC", "Apache Spark MLlib", "FastAI", "LangChain", "LlamaIndex",
    ],
    "big_data": [
        "Apache Spark", "Hadoop", "Kafka", "Apache Flink", "Apache Airflow",
        "Apache Beam", "Hive", "Pig", "HDFS", "Storm", "NiFi",
        "Databricks", "Presto", "Trino", "dbt", "Fivetran",
    ],
    "mobile_development": [
        "iOS Development", "Android Development", "React Native", "Flutter",
        "Xamarin", "Ionic", "Cordova", "SwiftUI", "Jetpack Compose",
    ],
    "testing_qa": [
        "Unit Testing", "Integration Testing", "End-to-End Testing",
        "Selenium", "Cypress", "Jest", "Mocha", "Chai", "JUnit", "TestNG",
        "pytest", "Postman", "SoapUI", "JMeter", "LoadRunner",
        "Cucumber", "Appium", "Playwright", "Vitest", "Test Driven Development",
    ],
    "salesforce": [
        "Salesforce", "Apex", "Visualforce", "Lightning Web Components",
        "Aura Components", "SOQL", "SOSL", "Salesforce Administration",
        "Sales Cloud", "Service Cloud", "Marketing Cloud", "Pardot",
        "Salesforce CPQ", "Einstein Analytics", "Process Builder", "Flow",
        "Trigger Framework",
    ],
    "soft_skills": [
        "Communication", "Leadership", "Teamwork", "Problem Solving",
        "Critical Thinking", "Time Management", "Adaptability",
        "Creativity", "Collaboration", "Project Management",
        "Conflict Resolution", "Decision Making", "Mentoring",
        "Public Speaking", "Negotiation", "Emotional Intelligence",
        "Attention to Detail", "Analytical Skills", "Stakeholder Management",
        "Cross-functional Collaboration",
    ],
    "project_management": [
        "Agile", "Scrum", "Kanban", "Waterfall", "JIRA", "Confluence",
        "Trello", "Asana", "Monday.com", "Microsoft Project", "Notion",
        "ClickUp", "PMP", "PRINCE2", "SAFe", "Lean", "Six Sigma", "OKRs",
    ],
    "cybersecurity": [
        "Cybersecurity", "Penetration Testing", "Ethical Hacking",
        "Network Security", "Application Security", "Cryptography",
        "OWASP", "SIEM", "Firewalls", "Vulnerability Assessment",
        "Incident Response", "Security Auditing", "Identity Access Management",
        "Zero Trust", "ISO 27001", "Burp Suite", "Metasploit", "Wireshark",
        "Nmap", "Kali Linux", "SOC", "Threat Modeling",
    ],
    "marketing": [
        "Digital Marketing", "SEO", "SEM", "Content Marketing",
        "Email Marketing", "Social Media Marketing", "Google Analytics",
        "Google Ads", "Facebook Ads", "HubSpot", "Mailchimp",
        "Marketing Automation", "Brand Management", "Copywriting",
        "Influencer Marketing", "Affiliate Marketing",
        "Conversion Rate Optimization", "Marketing Strategy",
        "Campaign Management", "Salesforce Marketing Cloud",
    ],
    "finance_accounting": [
        "Financial Analysis", "Financial Modeling", "Accounting",
        "Bookkeeping", "QuickBooks", "SAP", "Oracle Financials",
        "Excel", "Advanced Excel", "Power BI", "Tableau", "Looker",
        "Budgeting", "Forecasting", "Risk Management", "Investment Analysis",
        "Portfolio Management", "Equity Research", "Derivatives",
        "GAAP", "IFRS", "Tax Preparation", "Auditing", "Bloomberg Terminal",
        "Variance Analysis", "FP&A",
    ],
    "design": [
        "UI/UX Design", "User Research", "Wireframing", "Prototyping",
        "Figma", "Adobe XD", "Sketch", "InVision", "Adobe Photoshop",
        "Adobe Illustrator", "Adobe Premiere", "Adobe After Effects",
        "Canva", "Graphic Design", "Web Design", "Interaction Design",
        "Design Thinking", "Design Systems", "Accessibility",
    ],
    "healthcare": [
        "HIPAA", "Electronic Health Records", "Medical Terminology",
        "Patient Care", "Clinical Research", "Healthcare Analytics",
        "HL7", "FHIR", "Medical Coding",
    ],
    "operating_systems": [
        "Linux", "Ubuntu", "CentOS", "Red Hat", "Debian",
        "Windows Server", "macOS", "Unix",
    ],
    "certifications": [
        "AWS Certified Solutions Architect", "AWS Certified Developer",
        "Azure Fundamentals", "Google Cloud Professional",
        "Certified Kubernetes Administrator", "CISSP", "CEH",
        "CompTIA Security+", "CompTIA Network+", "CCNA", "CCNP",
        "Salesforce Certified Administrator",
        "Salesforce Certified Platform Developer", "PMP",
        "Certified Scrum Master", "ITIL",
        "Six Sigma Green Belt", "Six Sigma Black Belt",
    ],
}


def get_all_skills() -> Set[str]:
    """Return a flat set of every canonical skill across all categories."""
    skills: Set[str] = set()
    for v in SKILLS_TAXONOMY.values():
        skills.update(v)
    return skills


def get_hard_skills() -> Set[str]:
    """All skills except soft skills."""
    skills: Set[str] = set()
    for cat, v in SKILLS_TAXONOMY.items():
        if cat != "soft_skills":
            skills.update(v)
    return skills


def get_soft_skills() -> Set[str]:
    return set(SKILLS_TAXONOMY["soft_skills"])


def get_skill_category(skill: str) -> str:
    """Return the category name a canonical skill belongs to, or 'other'."""
    for cat, items in SKILLS_TAXONOMY.items():
        if skill in items:
            return cat
    return "other"


# ---------------------------------------------------------------------------
# SYNONYMS / ABBREVIATIONS / VARIANTS
# All keys are LOWERCASE. Values are canonical skill names.
# ---------------------------------------------------------------------------

SYNONYMS: Dict[str, str] = {
    # Languages
    "js": "JavaScript", "ecmascript": "JavaScript",
    "ts": "TypeScript",
    "py": "Python", "python3": "Python", "python 3": "Python",
    "golang": "Go",
    "cpp": "C++", "c plus plus": "C++", "c-plus-plus": "C++",
    "c sharp": "C#", "csharp": "C#", "c-sharp": "C#",
    "objective c": "Objective-C", "obj-c": "Objective-C",
    "shell": "Bash", "shell scripting": "Bash", "shell script": "Bash",
    "sh": "Bash",

    # Frontend
    "reactjs": "React", "react.js": "React", "react js": "React",
    "vuejs": "Vue.js", "vue": "Vue.js", "vue js": "Vue.js",
    "angularjs": "Angular", "angular js": "Angular",
    "nextjs": "Next.js", "next js": "Next.js",
    "nuxtjs": "Nuxt.js", "nuxt js": "Nuxt.js",
    "tailwind": "Tailwind CSS", "tailwindcss": "Tailwind CSS",
    "css3": "CSS", "html5": "HTML", "scss": "SASS",
    "material ui": "Material-UI", "mui": "Material-UI",

    # Backend
    "nodejs": "Node.js", "node": "Node.js", "node js": "Node.js",
    "express": "Express.js", "expressjs": "Express.js",
    "rails": "Ruby on Rails", "ror": "Ruby on Rails",
    "spring": "Spring Framework", "springboot": "Spring Boot",
    "spring boot": "Spring Boot",
    "dotnet": ".NET Core", ".net": ".NET Core", "dot net": ".NET Core",
    "asp.net": "ASP.NET", "aspnet": "ASP.NET",
    "rest": "REST API", "restful": "REST API",
    "restful api": "REST API", "restful apis": "REST API",
    "rest apis": "REST API", "rest services": "REST API",
    "websocket": "WebSockets", "web sockets": "WebSockets",
    "micro services": "Microservices", "micro-services": "Microservices",

    # Databases
    "postgres": "PostgreSQL", "psql": "PostgreSQL", "postgre": "PostgreSQL",
    "mongo": "MongoDB", "mongo db": "MongoDB",
    "mssql": "Microsoft SQL Server", "sql server": "Microsoft SQL Server",
    "ms sql": "Microsoft SQL Server", "ms sql server": "Microsoft SQL Server",
    "tsql": "Microsoft SQL Server", "t-sql": "Microsoft SQL Server",
    "dynamo db": "DynamoDB", "dynamo": "DynamoDB",
    "elastic search": "Elasticsearch", "elastic": "Elasticsearch", "es": "Elasticsearch",
    "rds": "RDS",
    "firebase realtime database": "Realtime Database",

    # Cloud
    "amazon web services": "AWS", "amazon aws": "AWS",
    "microsoft azure": "Azure", "azure cloud": "Azure",
    "gcp": "Google Cloud Platform", "google cloud": "Google Cloud Platform",
    "google cloud platform": "Google Cloud Platform",

    # AWS services
    "amazon ec2": "EC2", "amazon s3": "S3",
    "aws lambda": "Lambda", "amazon rds": "RDS",
    "amazon dynamodb": "DynamoDB",

    # DevOps
    "k8s": "Kubernetes", "kube": "Kubernetes",
    "github action": "GitHub Actions",
    "gitlab pipeline": "GitLab CI", "gitlab pipelines": "GitLab CI",
    "gitlab ci/cd": "GitLab CI", "gitlab cicd": "GitLab CI",
    "elk": "ELK Stack",
    "ci/cd": "Jenkins", "cicd": "Jenkins",
    "infrastructure as code": "Terraform", "iac": "Terraform",

    # Data / ML
    "ml": "Machine Learning", "ml/ai": "Machine Learning",
    "dl": "Deep Learning",
    "nlp": "Natural Language Processing",
    "cv": "Computer Vision",
    "ai": "Machine Learning", "artificial intelligence": "Machine Learning",
    "rl": "Reinforcement Learning",
    "tf": "TensorFlow", "tensorflow 2": "TensorFlow",
    "sklearn": "scikit-learn", "scikit learn": "scikit-learn",
    "huggingface": "Hugging Face", "hf": "Hugging Face",
    "cnn": "Convolutional Neural Networks",
    "rnn": "Recurrent Neural Networks", "lstm": "Recurrent Neural Networks",
    "gan": "GANs",
    "neural network": "Neural Networks", "neural net": "Neural Networks",
    "llm": "LLMs", "large language model": "LLMs",
    "large language models": "LLMs",
    "retrieval augmented generation": "RAG",
    "vector database": "Vector Databases", "vector db": "Vector Databases",

    # Big data
    "spark": "Apache Spark", "pyspark": "Apache Spark",
    "airflow": "Apache Airflow",
    "kafka streaming": "Kafka",
    "flink": "Apache Flink",

    # Mobile
    "ios": "iOS Development", "ios dev": "iOS Development",
    "android": "Android Development", "android dev": "Android Development",
    "rn": "React Native", "react-native": "React Native",

    # Testing
    "unit test": "Unit Testing", "unit tests": "Unit Testing",
    "integration test": "Integration Testing",
    "integration tests": "Integration Testing",
    "e2e": "End-to-End Testing", "e2e testing": "End-to-End Testing",
    "end to end testing": "End-to-End Testing",
    "tdd": "Test Driven Development",
    "test-driven development": "Test Driven Development",

    # Salesforce
    "sfdc": "Salesforce", "sf": "Salesforce",
    "lwc": "Lightning Web Components",
    "vf": "Visualforce",

    # PM
    "agile methodology": "Agile", "agile methodologies": "Agile",
    "scrum master": "Scrum",
    "kanban board": "Kanban",
    "jira tickets": "JIRA",

    # Security
    "cyber security": "Cybersecurity", "cyber-security": "Cybersecurity",
    "info sec": "Cybersecurity", "infosec": "Cybersecurity",
    "information security": "Cybersecurity",
    "pen testing": "Penetration Testing", "pentest": "Penetration Testing",
    "pentesting": "Penetration Testing",
    "iam": "Identity Access Management",

    # Marketing
    "search engine optimization": "SEO",
    "search engine marketing": "SEM",
    "ppc": "Google Ads", "pay per click": "Google Ads",
    "ga": "Google Analytics", "ga4": "Google Analytics",
    "cro": "Conversion Rate Optimization",

    # Finance
    "financial modelling": "Financial Modeling",
    "ms excel": "Excel", "microsoft excel": "Excel",
    "powerbi": "Power BI", "power-bi": "Power BI",
    "qb": "QuickBooks",
    "fp & a": "FP&A", "fp and a": "FP&A",

    # Design
    "ui design": "UI/UX Design", "ux design": "UI/UX Design",
    "ui/ux": "UI/UX Design", "ux": "UI/UX Design", "ui": "UI/UX Design",
    "user experience": "UI/UX Design",
    "user interface": "UI/UX Design",
    "photoshop": "Adobe Photoshop", "adobe ps": "Adobe Photoshop",
    "illustrator": "Adobe Illustrator", "adobe ai": "Adobe Illustrator",

    # OS
    "rhel": "Red Hat", "red hat enterprise linux": "Red Hat",

    # Soft
    "team work": "Teamwork", "team-work": "Teamwork",
    "communication skills": "Communication",
    "verbal communication": "Communication",
    "written communication": "Communication",
    "leadership skills": "Leadership",
    "problem-solving": "Problem Solving",
    "problem solver": "Problem Solving",
    "critical-thinking": "Critical Thinking",
    "stakeholder mgmt": "Stakeholder Management",
    "cross functional": "Cross-functional Collaboration",
    "cross-functional": "Cross-functional Collaboration",

    # Certifications
    "aws sa": "AWS Certified Solutions Architect",
    "aws solutions architect": "AWS Certified Solutions Architect",
    "csm": "Certified Scrum Master",
    "scrum master certification": "Certified Scrum Master",
    "az-900": "Azure Fundamentals",

    # Web servers / misc
    "graph ql": "GraphQL",
}


# ---------------------------------------------------------------------------
# SkillIndex: precomputed lookup that handles longest-match-first ordering,
# safe word boundaries for tokens with special chars (C++, C#, .NET).
# ---------------------------------------------------------------------------

class SkillIndex:
    """
    Lookup-optimized view of the taxonomy.

    Build once, reuse across every match call. Provides:
      - find_skills(text) -> list of (canonical, span)
      - normalize(phrase) -> canonical name or None
    """

    def __init__(self) -> None:
        self.canonical: Set[str] = get_all_skills()
        self.hard_skills: Set[str] = get_hard_skills()
        self.soft_skills: Set[str] = get_soft_skills()

        # Build (search_term_lower, canonical) pairs. We include both the
        # canonical names themselves and every synonym variant.
        pairs: List[Tuple[str, str]] = []
        for skill in self.canonical:
            pairs.append((skill.lower(), skill))
        for syn, canonical in SYNONYMS.items():
            pairs.append((syn.lower(), canonical))

        # Deduplicate while preserving insertion order; sort by length desc
        # so multi-word skills match before their substrings.
        seen: Set[str] = set()
        deduped: List[Tuple[str, str]] = []
        for term, canon in pairs:
            if term in seen:
                continue
            seen.add(term)
            deduped.append((term, canon))
        deduped.sort(key=lambda p: -len(p[0]))
        self._terms: List[Tuple[str, str]] = deduped

        # Pre-compile regex patterns. We allow + # . inside tokens so
        # 'c++', 'c#', '.net' match as words.
        self._patterns: List[Tuple[re.Pattern, str]] = []
        for term, canon in deduped:
            # Special handling: terms ending in special char need lookahead
            # tweaks. Simplest: build a strict pattern for each.
            pat = self._make_pattern(term)
            self._patterns.append((pat, canon))

    @staticmethod
    def _make_pattern(term: str) -> re.Pattern:
        # Word boundary that's safe for tech tokens: char before/after must
        # NOT be alphanumeric or '+', '#', '.', '/'.
        # Escape the term, build (?<![bad])TERM(?![bad]).
        escaped = re.escape(term)
        # We need to allow '/' as a separator between tokens, but inside a
        # term like "ci/cd" we want it to stay. Use the same boundary set.
        boundary = r"[a-z0-9+#./\-]"
        pattern = rf"(?<!{boundary}){escaped}(?!{boundary})"
        return re.compile(pattern, re.IGNORECASE)

    def find_skills(self, text: str) -> List[Tuple[str, Tuple[int, int]]]:
        """
        Find all skill mentions in `text`.
        Returns a list of (canonical_skill, (start, end)) pairs.
        Overlapping matches are resolved longest-first.
        """
        if not text:
            return []
        text_lower = text.lower()
        spans: List[Tuple[str, Tuple[int, int]]] = []
        # Track occupied character ranges so we don't double-match shorter
        # substrings inside already-matched longer ones.
        occupied: List[Tuple[int, int]] = []

        for pat, canon in self._patterns:
            for m in pat.finditer(text_lower):
                start, end = m.span()
                if any(s <= start < e or s < end <= e
                       or (start <= s and end >= e)
                       for s, e in occupied):
                    continue
                occupied.append((start, end))
                spans.append((canon, (start, end)))

        # Sort by start offset for stable downstream consumption.
        spans.sort(key=lambda x: x[1][0])
        return spans

    def normalize(self, phrase: str) -> str:
        """Map a free-text skill phrase to its canonical name (or itself)."""
        if not phrase:
            return phrase
        cleaned = phrase.strip().lower()
        if cleaned in SYNONYMS:
            return SYNONYMS[cleaned]
        for canon in self.canonical:
            if canon.lower() == cleaned:
                return canon
        return phrase.strip()


# Module-level singleton for reuse.
SKILL_INDEX = SkillIndex()
