import asyncio
from datetime import datetime
from auth import get_password_hash
from database import (
    Database,
    profile_collection,
    skills_collection,
    projects_collection,
    projects_page_collection,
    education_collection,
    experience_collection,
    learning_journey_collection,
    experiments_collection,
    growth_mindset_collection,
    contact_section_collection,
    footer_collection,
    admin_collection
)
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))


async def seed_database():
    """Seed database with initial portfolio data, clearing old data first."""

    print("🧹 Clearing existing data...")
    # --- THIS IS THE NEW PART ---
    # Clear existing data to prevent duplicates
    await projects_collection.delete_many({})
    await projects_page_collection.delete_many({})
    await education_collection.delete_many({})
    await experience_collection.delete_many({})
    await learning_journey_collection.delete_many({})
    await experiments_collection.delete_many({})
    await growth_mindset_collection.delete_many({})
    await contact_section_collection.delete_many({})
    await admin_collection.delete_many({})
    await profile_collection.delete_many({})
    await skills_collection.delete_many({})
    await footer_collection.delete_many({})
    # Profile and Skills are updated with replace_one(upsert=True), so they don't need clearing.
    # --- END OF NEW PART ---
    print("🗑️  Old data cleared.")

    # Profile data
    profile_data = {
        "name": "Bhavy Upreti",
        "headline": "Fusing Algorithms, Aesthetics & AI into Scalable Web Systems",
        "bio": "Hey, I'm Bhavy — a developer deeply immersed in crafting futuristic admin panels, intelligent cloud-native systems, and elegant algorithmic solutions. Whether it's experimenting with tree dynamic programming, designing React interfaces with animated gradients, or pushing Pop!_OS to its visual limits, I thrive at the intersection of performance and design. I’m currently focused on advanced frontend engineering, building AI-enhanced UIs, and scalable Full-Stack applications. My mission? To create intuitive interfaces, cutting-edge cloud automation — all while keeping code clean, efficient, and visually sharp.",
        "highlights": "Futuristic Frontends · DSA enthusiast · Cloud-Native Thinker · Scalable Full Stack Developments",
        "profileImage": "https://i.pinimg.com/736x/e9/cf/97/e9cf9789b8aef190464d0169683f75cc.jpg",
        "email": "bhavyupreti0@gmail.com",
        "linkedin": "https://www.linkedin.com/in/bhavy-upreti-772b6b331/",
        "github": "https://github.com/bhavyup",
        "telegram": "https://t.me/bhavyupreti",
        "instagram": "https://www.instagram.com/bhavy_upreti/",
        "location": "Nainital, Uttarakhand, India",
        "resume_url": "https://github.com/user-attachments/files/22005795/NoLC.Resume.pdf",
        "role": "Full-Stack Developer",
        "hero_title": "STATUS: ONLINE",
        "hero_lines": [
            "Executing portfolio.sh...",
            "> Welcome, agent.",
            "> Initializing Connection...",
            "> Scanning for IP Adresses..."
        ],
        "updatedAt": datetime.utcnow(),
        "skills_primary": ["React", "JavaScript", "Node", "WebGL", "Systems", "Design","Python", "Java", "FastAPI", "TailwindCSS", "AWS", "Docker"],
        "chipCount": 8
    }
    await Database.update_profile(profile_data)

    # Skills data''
    skills_data = {
        "Learning": [
            {"name": "Cloud Computing", "proficiency": 60},
            {"name": "Automation", "proficiency": 65},
            {"name": "AI Integration", "proficiency": 70}
        ],
        "Programming": [
            {"name": "Python", "proficiency": 80},
            {"name": "Java", "proficiency": 95},
            {"name": "JavaScript", "proficiency": 90},
            {"name": "C", "proficiency": 85},
            {"name": "C++", "proficiency": 80},
            {"name": "SQL", "proficiency": 85},
            {"name": "Data Structures & Algorithms", "proficiency": 90},
        ],
        "Frontend": [
            {"name": "HTML", "proficiency": 90},
            {"name": "CSS", "proficiency": 85},
            {"name": "JavaScript", "proficiency": 80},
            {"name": "React", "proficiency": 85},
            {"name": "Tailwind CSS", "proficiency": 85},
            {"name": "Next.js", "proficiency": 80}
        ],
        "Backend": [
            {"name": "Python", "proficiency": 80},
            {"name": "Java", "proficiency": 85},
            {"name": "Node.js", "proficiency": 75},
            {"name": "Express.js", "proficiency": 75},
            {"name": "Django", "proficiency": 80},
            {"name": "Spring Boot", "proficiency": 70}
        ],
        "Databases": [
            {"name": "MySQL", "proficiency": 80},
            {"name": "PostgreSQL", "proficiency": 75},
            {"name": "MongoDB", "proficiency": 80},
        ],
        "Cloud": [
            {"name": "AWS", "proficiency": 85},
            {"name": "Google Cloud", "proficiency": 70},
            {"name": "Microsoft Azure", "proficiency": 65},
            {"name": "Firebase", "proficiency": 80}
        ],
        "API": [
            {"name": "REST APIs", "proficiency": 80},
            {"name": "GraphQL", "proficiency": 70},
            {"name": "WebSockets", "proficiency": 65}
        ],
        "Tools": [
            {"name": "Cursor", "proficiency": 80},
            {"name": "Perplexity AI", "proficiency": 80},
            {"name": "Claude Code", "proficiency": 95},
            {"name": "Figma", "proficiency": 75},
            {"name": "Git", "proficiency": 85},
            {"name": "GitHub", "proficiency": 85},
            {"name": "Docker", "proficiency": 75},
            {"name": "Postman", "proficiency": 80},
            {"name": "VS Code", "proficiency": 90},
            {"name": "Jenkins", "proficiency": 65}
        ],
        "Soft Skills": [
            {"name": "Problem Solving", "proficiency": 90},
            {"name": "Team Collaboration", "proficiency": 85},
            {"name": "Adaptability", "proficiency": 85},
            {"name": "Time Management", "proficiency": 80},
            {"name": "Communication", "proficiency": 85}
        ]
    }

    for category, skills in skills_data.items():
        # This line now passes the list of skill objects
        await Database.update_skills(category, skills)

    project_page = {
        "header": "ARTIFACTS · PROJECTS",
        "subtitle": "Selected works — experiments in automation, AI, and striking design.",
        "tip": "Tip: hover a card for parallax. Click cards for deep view.",
    }
    await Database.update_projects_page(project_page)

    # Projects data
    projects_data = [
        {
            "title": "Coming Soon: AI Agents",
            "description": "Exploring autonomous AI agents for task automation",
            "status": "coming-soon",
            "image": "https://images.unsplash.com/photo-1677442136019-21780ecad995?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80",
            "liveUrl": None,
            "githubUrl": None,
            "year": 2026,
            "technologies": ["Python", "AI", "Automation"],
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow(),

        },
        {
            "title": "Mobile Responsive Portfolio Site",
            "description": "Combined coding with design to create a fully responsive portfolio site with HTML, CSS, and JavaScript. ( Frontend Only )",
            "status": "completed",
            "image": "https://images.unsplash.com/photo-1755685391939-7809f2287657?q=80&w=2030&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
            "liveUrl": "https://bhavyup.github.io/My-Portfolio/",
            "githubUrl": "https://github.com/bhavyup/My-Portfolio",
            "technologies": ["HTML", "CSS", "JavaScript", "GitHub", "Netlify"],
            "year": 2023,
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        },
        {
            "title": "Full-Stack Portfolio Site",
            "description": "A fully dynamic portfolio frontend with a FastAPI-led backend with a highly customizalbe UI and Admiin Panel.",
            "status": "completed",
            "image": "https://images.unsplash.com/photo-1755685582932-d82047249102?q=80&w=2036&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
            "liveUrl": "https://bhavyup.github.io/Full-Stack-Portfolio/",
            "githubUrl": "https://github.com/bhavyup/Full-Stack-Portfolio",
            "technologies": ["Python", "ReactJs", "FastAPI", "TailwindCSS", "Netlify", "GitHub"],
            "year": 2025,
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        }
    ]

    for project in projects_data:
        await Database.create_project(project)

    # Education data
    education_data = [{
        "degree": "B.Tech",
        "program": "Computer Science & Engineering",
        "institution": "Dr. A. P. J. Abdul Kalam Institute Of Technology",
        "university": "VMSB Uttarakhand Technical University, Dehradun",
        "location": "Uttarakhand, IN",
        "start": "2022",
        "end": "2026",
        "year": "2026",
        "gpa": "8.5",
        "progress": 75,  # optional; UI will estimate from start/end if omitted
        "achievements": [
            "Smart India Hackathon"
        ],
        "coursework": [
            "Data Structures & Algorithms",
            "Operating Systems",
            "Database Systems",
            "Computer Networks",
            "Machine Learning",
            "Distributed Systems"
        ],
        "link": "https://verify.example.com/credential/btech-cse-2026",
        "logo": "https://ittanakpur.ac.in/wp-content/uploads/2022/03/logo-removebg-preview.png",
        "verified": True,
        "type": "Graduation",
        "updatedAt": datetime.utcnow()
    },
        {
        "degree": "Matriculation",
        "program": None,
        "institution": "M. P. Hindu Inter College",
        "university": "Uttarakhand Board of Secondary Education",
        "location": "Uttarakhand, IN",
        "start": None,
        "end": None,
        "year": "2020",
        "gpa": "9.5",
        "progress": 100,  # optional; UI will estimate from start/end if omitted
        "achievements": [
            "Boards Merit Scholarship (2020)",
            "Maths Olympiad"
        ],
        "coursework": [
            "Mathematics",
            "Science",
            "Social Science",
            "English",
            "Hindi",
            "Sanskrit"
        ],
        "link": "https://verify.example.com/credential/btech-cse-2026",
        "logo": "https://cdnbbsr.s3waas.gov.in/s32dbf21633f03afcf882eaf10e4b5caca/uploads/2025/06/202506161706829322.png",
        "verified": True,
        "type": "Matriculation",
        "updatedAt": datetime.utcnow()
    },
        {
        "degree": "Intermediate",
        "program": "PCM",
        "institution": "M. P. Hindu Inter College",
        "university": "Uttarakhand Board of Secondary Education",
        "location": "Uttarakhand, IN",
        "start": None,
        "end": None,
        "year": "2022",
        "gpa": "9.5",
        "progress": 100,  # optional; UI will estimate from start/end if omitted
        "achievements": [
            "Boards Merit Scholarship (2022)",
            "Science Olympiad"
        ],
        "coursework": [
            "Physics",
            "Chemistry",
            "Mathematics",
            "English",
            "Hindi",
            "Sanskrit",
        ],
        "link": "https://verify.example.com/credential/btech-cse-2026",
        "logo": "https://cdnbbsr.s3waas.gov.in/s32dbf21633f03afcf882eaf10e4b5caca/uploads/2025/06/202506161706829322.png",
        "verified": True,
        "type": "Intermediate",
        "updatedAt": datetime.utcnow()
    }
    ]
    for edu in education_data:
        await Database.create_education(edu)

    # Experience data
    experience_data = [
        {
            "role": "Software Developer Intern",
            "company": "Tech Solutions Inc.",
            "location": "New York, USA",
            "start": "2023-06",
            "end": "2023-08",
            "bullets": [
                "Developed and maintained web applications using React and Node.js.",
                "Collaborated with cross-functional teams to define, design, and ship new features.",
                "Optimized applications for maximum speed and scalability.",
                "Participated in code reviews and contributed to team knowledge sharing."
            ],
            "technologies": ["React", "Node.js", "JavaScript", "CSS", "HTML"],
            "type": "internship",
            "t": 0.3,
            "description": "Description of the internship experience.",
            "updatedAt": datetime.utcnow()
        },
        {
            "role": "Open Source Contributor",
            "company": "Open Source Community",
            "location": "Global",
            "start": "2023-09",
            "end": None,
            "bullets": [
                "Contributed to various open-source projects on GitHub.",
                "Fixed bugs, implemented new features, and improved documentation.",
                "Engaged with the community to provide support and gather feedback."
            ],
            "technologies": ["Python", "JavaScript", "HTML", "CSS"],
            "type": "volunteering",
            "t": 0.6,
            "description": "Description of the open source contribution experience.",
            "updatedAt": datetime.utcnow()
        }, 
        {
            "role": "Freelance Web Developer",
            "company": "Self-Employed",
            "location": "Remote",    
            "start": "2023-10",
            "end": None,    
            "bullets": [
                "Designed and developed responsive websites for small businesses and individuals.",
                "Worked closely with clients to understand their requirements and deliver customized solutions.",
                "Ensured websites were optimized for SEO and performance.",
                "Provided ongoing maintenance and support for existing websites."
            ],
            "technologies": ["HTML", "CSS", "JavaScript", "WordPress", "React"],
            "type": "work",
            "t": 0.9,
            "description": "Description of the freelance web development experience.",
            "updatedAt": datetime.utcnow()
        }
    ]
    
    for experience in experience_data:
        await Database.create_experience(experience)
    
    # Learning Journey data
    learning_journey_data = [
        {
            "phase": "Foundation",
            "skills": ["HTML", "CSS", "Python", "Java"],
            "status": "completed",
            "order": 1,
            "updatedAt": datetime.utcnow()
        },
        {
            "phase": "Current Focus",
            "skills": ["Cloud Computing", "AI Tools", "Automation"],
            "status": "in-progress",
            "order": 2,
            "updatedAt": datetime.utcnow()
        },
        {
            "phase": "Next Goals",
            "skills": ["Advanced Cloud Architecture", "ML Integration", "DevOps"],
            "status": "planned",
            "order": 3,
            "updatedAt": datetime.utcnow()
        }
    ]

    for phase in learning_journey_data:
        await Database.create_learning_phase(phase)

    growth_mindset_data = {
        "title": "Growth Mindset",
        "quote": "\"The journey of a thousand miles begins with a single step. Every skill learned, every challenge overcome, brings me closer to my goals.\"",
        "updatedAt": datetime.utcnow()
    }
    await Database.update_growth_mindset(growth_mindset_data)

    # Experiments data
    experiments_section_data = {
        "header_title": "Latest Experiments",
        "header_description": "Pushing boundaries with AI, automation, and creative technology solutions",
        "lab_title": "Innovation Lab",
        "lab_description": "This is where ideas transform into reality. Every experiment here represents a step toward the future of technology, combining AI, automation, and human creativity to solve real-world challenges.",
        "lab_features": [
            {"title": "AI Integration",
                "description": "Exploring intelligent automation"},
            {"title": "Creative Solutions",
                "description": "Innovative problem-solving approaches"},
            {"title": "Rapid Prototyping", "description": "Fast iteration and testing"}
        ],
        "experiments": [
            {
                "title": "AI-Powered Portfolio Management",
                "description": "Experimenting with dynamic content generation using AI.",
                "status": "active"
            },
            {
                "title": "Cloud Automation Scripts",
                "description": "Building automation tools for cloud resource management.",
                "status": "planning"
            }
        ],
        "updatedAt": datetime.utcnow()
    }
    await Database.update_experiments_section(experiments_section_data)

    contact_section_data = {
        "header_title": "Contact & Social",
        "header_description": "Let's connect and build something amazing together!",
        "connect_title": "Let's Connect!",
        "connect_description": "Open to internships, learning projects, or creative tech collaborations!",
        "get_in_touch_title": "Get In Touch",
        "get_in_touch_description": "I'm always excited to discuss new opportunities... I'd love to hear from you!",
        "contact_links": [
            {
                "name": "Email",
                "value": "missiyaa.111@gmail.com",
                "icon": "Mail",
                "color": "Mail"
            },
            {
                "name": "LinkedIn",
                "value": "linkedin.com/in/shreeya-swarupa-das-660689289",
                "icon": "Linkedin",
                "color": "Linkedin"
            },
            {
                "name": "Location",
                "value": "Odisha, India",
                "icon": "MapPin",
                "color": "MapPin"
            }
        ],
        "updatedAt": datetime.utcnow()
    }
    await Database.update_contact_section(contact_section_data)

    footer_data = {
        "brand_name": "Shreeya Das",
        "brand_description": "Crafting scalable cloud solutions with creativity and code. Always learning, always building.",
        "quick_links": [
            {"name": "About", "href": "#about"},
            {"name": "Skills", "href": "#skills"},
            {"name": "Projects", "href": "#projects"},
            {"name": "Contact", "href": "#contact"}
        ],
        "connect_title": "Let's Connect",
        "connect_description": "Open to internships, learning projects, or creative tech collaborations!",
        "bottom_text": "Building the future, one line at a time",
        "updatedAt": datetime.utcnow()
    }
    await Database.update_footer(footer_data)

    # Admin user
    admin_data = {
        "username": "shreeya",
        "password": get_password_hash("shreeya123"),
        "name": "Shreeya Swarupa Das",
        "profileImage": profile_data["profileImage"],
        "role": "superadmin",
        "createdAt": datetime.utcnow()
    }
    await Database.create_admin(admin_data)

    print("✅ Database seeded successfully!")

if __name__ == "__main__":
    asyncio.run(seed_database())
