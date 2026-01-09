from motor.motor_asyncio import AsyncIOMotorClient
from pathlib import Path
from dotenv import load_dotenv
import os
import logging
import asyncio
from pymongo import ASCENDING
from bson import ObjectId

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# MongoDB connection
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

# Collections
profile_collection = db.profile
skills_collection = db.skills
projects_collection = db.projects
projects_page_collection = db.projects_page
education_collection = db.education
experience_collection = db.experience
learning_journey_collection = db.learning_journey
experiments_collection = db.experiments
contact_section_collection = db.contact_section
contact_messages_collection = db.contact_messages
admin_collection = db.admin
growth_mindset_collection = db.growth_mindset
footer_collection = db.footer
notifications_collection = db.notifications

logger = logging.getLogger(__name__)


class Database:
    @staticmethod
    async def create_indexes():
        """Creates database indexes on startup."""
        try:
            # This creates an index on the 'createdAt' field.
            # MongoDB will automatically delete any document 30 days after its 'createdAt' time.
            # 2592000 seconds = 30 days
            await notifications_collection.create_index(
                [("createdAt", ASCENDING)],
                expireAfterSeconds=864000
            )
            logger.info("TTL index for notifications created successfully.")
        except Exception as e:
            logger.error(f"Error creating TTL index: {e}")

    @staticmethod
    async def search_content(query: str):
        """Search for a query across all major portfolio content."""
        try:
            search_regex = {"$regex": query, "$options": "i"}

            profile_task = profile_collection.find_one({
                "$or": [{"name": search_regex}, {"headline": search_regex}, {"bio": search_regex}, {"highlights": search_regex}, {"location": search_regex}, {"email": search_regex}, {"linkedin": search_regex}]
            })

            projects_task = projects_collection.find({
                "$or": [
                    {"title": search_regex},
                    {"description": search_regex},
                    {"technologies": search_regex},
                    {"status": search_regex},
                    {"liveUrl": search_regex},    # <-- ADDED
                    {"githubUrl": search_regex}  # <-- ADDED
                ]
            }).to_list(length=None)

            skills_task = skills_collection.find({
                "$or": [{"category": search_regex}, {"skills.name": search_regex}]
            }).to_list(length=None)

            education_task = education_collection.find_one({
                "$or": [{"degree": search_regex}, {"institution": search_regex}, {"year": search_regex}]
            })

            experience_task = experience_collection.find_one({
                "$or": [{"main_title": search_regex}, {"main_message": search_regex}, {"goals.title": search_regex}, {"goals.description": search_regex}, {"cta_title": search_regex}, {"cta_message": search_regex}]
            })

            learning_journey_task = learning_journey_collection.find({
                "$or": [{"phase": search_regex}, {"skills": search_regex}, {"status": search_regex}]
            }).to_list(length=None)

            growth_mindset_task = growth_mindset_collection.find_one({
                "$or": [{"title": search_regex}, {"quote": search_regex}]
            })

            experiments_task = experiments_collection.find_one({
                "$or": [
                    {"header_title": search_regex}, {
                        "header_description": search_regex},
                    {"lab_title": search_regex}, {
                        "lab_description": search_regex},
                    {"lab_features.title": search_regex}, {
                        "lab_features.description": search_regex},
                    {"experiments.title": search_regex}, {
                        "experiments.description": search_regex},
                    {"experiments.status": search_regex}
                ]
            })

            contacts_task = contact_section_collection.find_one({
                "$or": [
                    {"header_title": search_regex}, {
                        "header_description": search_regex},
                    {"connect_title": search_regex}, {
                        "connect_description": search_regex},
                    {"get_in_touch_title": search_regex}, {
                        "get_in_touch_description": search_regex},
                    {"contact_links.name": search_regex}, {"contact_links.value": search_regex}, {
                        "contact_links.icon": search_regex},
                ]
            })

            footer_task = footer_collection.find_one({
                "$or": [
                    {"brand_name": search_regex}, {
                        "brand_description": search_regex},
                    {"quick_links.name": search_regex}, {
                        "quick_links.href": search_regex},
                    {"connect_title": search_regex}, {
                        "connect_description": search_regex},
                    {"bottom_text": search_regex}
                ]
            })

            # Run all searches concurrently
            profile_match, projects_docs, skills_docs, education_match, experience_match, learning_journey_docs, growth_mindset_match, experiments_match, contact_section_match, footer_match = await asyncio.gather(
                profile_task, projects_task, skills_task, education_task, experience_task, learning_journey_task, growth_mindset_task, experiments_task, contacts_task, footer_task
            )

            # Process results
            results = {"profile": [], "projects": [], "skills": [], "education": [], "experience": [
            ], "learning_journey": [], "growth_mindset": [], "experiments": [], "contact": [], "footer": []}

            # --- NEW: PROCESS FOOTER SECTION ---
            if footer_match:
                fields_to_check = ["brand_name", "brand_description",
                                   "connect_title", "connect_description", "bottom_text"]
                for field in fields_to_check:
                    value = footer_match.get(field)
                    if isinstance(value, str) and query.lower() in value.lower():
                        results["footer"].append(
                            {"field": field.replace('_', ' ').capitalize(), "value": value})

                for link in footer_match.get("quick_links", []):
                    if query.lower() in link.get("name", "").lower() or query.lower() in link.get("href", "").lower():
                        results["footer"].append(
                            {"field": f"Quick Link: {link.get('name')}", "value": link.get('href')})

            if contact_section_match:
                fields_to_check = ["header_title", "header_description", "connect_title",
                                   "connect_description", "get_in_touch_title", "get_in_touch_description"]
                for field in fields_to_check:
                    value = contact_section_match.get(field)
                    if isinstance(value, str) and query.lower() in value.lower():
                        results["contact"].append(
                            {"field": field.replace('_', ' ').capitalize(), "value": value})

                for link in contact_section_match.get("contact_links", []):
                    if query.lower() in link.get("name", "").lower() or query.lower() in link.get("value", "").lower() or query.lower() in link.get("icon", "").lower():
                        results["contact"].append({"field": f"Contact Link: {link.get('name')}", "value": link.get(
                            'value'), "icon": link.get('icon')})

            if experiments_match:
                fields_to_check = [
                    "header_title", "header_description", "lab_title", "lab_description"]
                for field in fields_to_check:
                    value = experiments_match.get(field)
                    if isinstance(value, str) and query.lower() in value.lower():
                        results["experiments"].append(
                            {"field": field.replace('_', ' ').capitalize(), "value": value})

                for feature in experiments_match.get("lab_features", []):
                    if query.lower() in feature.get("title", "").lower() or query.lower() in feature.get("description", "").lower():
                        results["experiments"].append(
                            {"field": f"Lab Feature: {feature.get('title')}", "value": feature.get('description')})

                for experiment in experiments_match.get("experiments", []):
                    if query.lower() in experiment.get("title", "").lower() or query.lower() in experiment.get("description", "").lower() or query.lower() in experiment.get("status", "").lower():
                        results["experiments"].append(
                            {"field": f"Experiment: {experiment.get('title')}", "value": experiment.get('description')})

            if profile_match:
                fields_to_check = ["name", "headline", "bio",
                                   "highlights", "location", "email", "linkedin"]
                for field in fields_to_check:
                    value = profile_match.get(field)
                    if isinstance(value, str) and query.lower() in value.lower():
                        results["profile"].append({
                            # e.g., "Resume url"
                            "field": field.replace('_', ' ').capitalize(),
                            "value": value
                        })

            if education_match:
                fields_to_check = ["degree", "institution", "year"]
                for field in fields_to_check:
                    value = education_match.get(field)
                    if isinstance(value, str) and query.lower() in value.lower():
                        results["education"].append({
                            "field": field.capitalize(),
                            "value": value
                        })

            if experience_match:
                fields_to_check = ["main_title",
                                   "main_message", "cta_title", "cta_message"]
                for field in fields_to_check:
                    value = experience_match.get(field)
                    if isinstance(value, str) and query.lower() in value.lower():
                        results["experience"].append({
                            "field": field.replace('_', ' ').capitalize(),
                            "value": value
                        })
                for goal in experience_match.get("goals", []):
                    if query.lower() in goal.get("title", "").lower():
                        results["experience"].append({
                            "field": f"Goal: {goal.get('title')}",
                            "value": goal.get('description')
                        })
                    elif query.lower() in goal.get("description", "").lower():
                        results["experience"].append({
                            "field": f"Goal: {goal.get('title')}",
                            "value": goal.get('description')
                        })

            project_results = []
            seen_projects = set()
            for project in projects_docs:
                project_id = str(project["_id"])
                if project_id in seen_projects:
                    continue
                matches_in_project = []
                if query.lower() in project.get("title", "").lower():
                    matches_in_project.append("Match in title")
                if query.lower() in project.get("description", "").lower():
                    matches_in_project.append("Match in description")
                if query.lower() in project.get("status", "").lower():
                    matches_in_project.append(
                        f"Match in status: '{project.get('status')}'")
                for tech in project.get("technologies", []):
                    if query.lower() in tech.lower():
                        matches_in_project.append(
                            f"Match in technology: '{tech}'")
                if project.get("liveUrl") and query.lower() in project.get("liveUrl", "").lower():
                    matches_in_project.append("Match in Live URL")
                if project.get("githubUrl") and query.lower() in project.get("githubUrl", "").lower():
                    matches_in_project.append("Match in GitHub URL")
                if matches_in_project:
                    project_results.append({
                        "id": project_id,
                        "title": project.get("title"),
                        "matches": matches_in_project
                    })
                    seen_projects.add(project_id)

            results["projects"] = project_results

            skill_results = []
            seen_skills = set()
            for s_doc in skills_docs:
                category = s_doc.get("category", "Unknown")
                if query.lower() in category.lower():
                    category_match_id = f"category-{category}"
                    if category_match_id not in seen_skills:
                        skill_results.append({
                            "type": "category",
                            "name": category
                        })
                        seen_skills.add(category_match_id)
                for skill in s_doc.get("skills", []):
                    skill_name = skill.get("name")
                    if skill_name and query.lower() in skill_name.lower():
                        skill_match_id = f"skill-{skill_name}-{category}"
                        if skill_match_id not in seen_skills:
                            skill_results.append({
                                "type": "skill",
                                "name": skill_name,
                                "proficiency": skill.get("proficiency"),
                                "category": category
                            })
                            seen_skills.add(skill_match_id)
            results["skills"] = skill_results

            if learning_journey_docs:
                for phase in learning_journey_docs:
                    results["learning_journey"].append({
                        "field": f"Phase: {phase.get('phase')}",
                        "value": f"Status: {phase.get('status')}. Skills: {', '.join(phase.get('skills', []))}"
                    })

            if growth_mindset_match:
                if query.lower() in growth_mindset_match.get("title", "").lower():
                    results["growth_mindset"].append(
                        {"field": "Title", "value": growth_mindset_match.get("title")})
                if query.lower() in growth_mindset_match.get("quote", "").lower():
                    results["growth_mindset"].append(
                        {"field": "Quote", "value": growth_mindset_match.get("quote")})

            return results
        except Exception as e:
            logger.error(f"Error during content search: {e}")
            return {"profile": [], "projects": [], "skills": [], "education": [], "experience": []}

    @staticmethod
    async def get_profile():
        """Get profile data"""
        try:
            profile = await profile_collection.find_one()
            if profile:
                profile["id"] = str(profile["_id"])
                del profile["_id"]
            return profile
        except Exception as e:
            logger.error(f"Error getting profile: {e}")
            return None

    @staticmethod
    async def update_profile(profile_data: dict):
        """Update profile data"""
        try:
            result = await profile_collection.replace_one({}, profile_data, upsert=True)
            return result.acknowledged
        except Exception as e:
            logger.error(f"Error updating profile: {e}")
            return False

    @staticmethod
    async def get_skills():
        """Get all skills by category"""
        try:
            cursor = skills_collection.find()
            skills = {}
            async for skill_doc in cursor:
                skills[skill_doc["category"]] = skill_doc["skills"]
            return skills
        except Exception as e:
            logger.error(f"Error getting skills: {e}")
            return {}

    @staticmethod
    async def update_skills(category: str, skills: list):
        """Update skills for a category"""
        try:
            # The 'skills' variable is already a list of dictionaries, so we use it directly.
            # We use update_one to modify the document or create it if it doesn't exist.
            result = await skills_collection.update_one(
                {"_id": category},
                {"$set": {"skills": skills, "category": category}},
                upsert=True,
            )
            return result.acknowledged
        except Exception as e:
            logger.error(f"Error updating skills: {e}")
            return False

    @staticmethod
    async def delete_skills_category(category: str):
        """Delete a skill category"""
        try:
            result = await skills_collection.delete_one({"category": category})
            return result.deleted_count > 0
        except Exception as e:
            logger.error(f"Error deleting skills category {category}: {e}")
            return False

    @staticmethod
    async def get_projects_page():
        try:
            # Find the single document by its fixed ID
            content = await projects_page_collection.find_one({"_id": "projects_page_main"})
            return content
        except Exception as e:
            logger.error(f"Error getting projects page content: {e}")
            return None

    @staticmethod
    async def update_projects_page(data: dict):
        try:
            # Use update_one with $set for safe partial updates from the admin panel
            result = await projects_page_collection.update_one(
                {"_id": "projects_page_main"},
                {"$set": data},
                upsert=True
            )
            return result.acknowledged
        except Exception as e:
            logger.error(f"Error updating projects page content: {e}")
            return False

    @staticmethod
    async def get_projects():
        """Get all projects"""
        try:
            cursor = projects_collection.find().sort("createdAt", -1)
            projects = []
            async for project in cursor:
                project["id"] = str(project["_id"])
                del project["_id"]
                projects.append(project)
            return projects
        except Exception as e:
            logger.error(f"Error getting projects: {e}")
            return []

    @staticmethod
    async def create_project(project_data: dict):
        """Create new project"""
        try:
            result = await projects_collection.insert_one(project_data)
            return str(result.inserted_id)
        except Exception as e:
            logger.error(f"Error creating project: {e}")
            return None

    @staticmethod
    async def update_project(project_id: str, project_data: dict):
        """Update project"""
        try:
            from bson import ObjectId

            result = await projects_collection.update_one(
                {"_id": ObjectId(project_id)}, {"$set": project_data}
            )
            return result.acknowledged
        except Exception as e:
            logger.error(f"Error updating project: {e}")
            return False

    @staticmethod
    async def delete_project(project_id: str):
        """Delete project"""
        try:
            from bson import ObjectId

            result = await projects_collection.delete_one({"_id": ObjectId(project_id)})
            return result.deleted_count > 0
        except Exception as e:
            logger.error(f"Error deleting project: {e}")
            return False

    @staticmethod
    async def get_all_education():
        try:
            cursor = education_collection.find().sort(
                "year", -1)  # Sort descending by year
            education_list = []
            async for edu in cursor:
                edu["id"] = str(edu["_id"])
                del edu["_id"]
                education_list.append(edu)
            return education_list
        except Exception as e:
            logger.error(f"Error getting education list: {e}")
            return []

    @staticmethod
    async def create_education(education_data: dict):
        """Create a new education entry."""
        try:
            result = await education_collection.insert_one(education_data)
            return str(result.inserted_id)
        except Exception as e:
            logger.error(f"Error creating education entry: {e}")
            return None

    @staticmethod
    async def update_education(education_id: str, education_data: dict):
        """Update an education entry by its ID."""
        try:
            result = await education_collection.update_one(
                {"_id": ObjectId(education_id)}, {"$set": education_data}
            )
            return result.acknowledged
        except Exception as e:
            logger.error(f"Error updating education {education_id}: {e}")
            return False

    @staticmethod
    async def delete_education(education_id: str):
        """Delete an education entry by its ID."""
        try:
            result = await education_collection.delete_one({"_id": ObjectId(education_id)})
            return result.deleted_count > 0
        except Exception as e:
            logger.error(f"Error deleting education {education_id}: {e}")
            return False

    @staticmethod
    async def get_all_experience():
        """Get all experience entries, sorted by start date."""
        try:
            cursor = experience_collection.find().sort("start", -1)  # Sort newest first
            experience_list = []
            async for exp in cursor:
                exp["id"] = str(exp["_id"])
                del exp["_id"]
                experience_list.append(exp)
            return experience_list
        except Exception as e:
            logger.error(f"Error getting experience list: {e}")
            return []

    @staticmethod
    async def create_experience(experience_data: dict):
        """Create a new experience entry."""
        try:
            result = await experience_collection.insert_one(experience_data)
            return str(result.inserted_id)
        except Exception as e:
            logger.error(f"Error creating experience entry: {e}")
            return None

    @staticmethod
    async def update_experience(experience_id: str, experience_data: dict):
        """Update an experience entry by its ID."""
        try:
            result = await experience_collection.update_one(
                {"_id": ObjectId(experience_id)}, {"$set": experience_data}
            )
            return result.acknowledged
        except Exception as e:
            logger.error(f"Error updating experience {experience_id}: {e}")
            return False

    @staticmethod
    async def delete_experience(experience_id: str):
        """Delete an experience entry by its ID."""
        try:
            result = await experience_collection.delete_one({"_id": ObjectId(experience_id)})
            return result.deleted_count > 0
        except Exception as e:
            logger.error(f"Error deleting experience {experience_id}: {e}")
            return False

    @staticmethod
    async def get_growth_mindset():
        """Get growth mindset data"""
        try:
            data = await growth_mindset_collection.find_one()
            if data:
                data["id"] = str(data["_id"])
                del data["_id"]
            return data
        except Exception as e:
            logger.error(f"Error getting growth mindset data: {e}")
            return None

    @staticmethod
    async def update_growth_mindset(data: dict):
        """Update growth mindset data"""
        try:
            result = await growth_mindset_collection.replace_one({}, data, upsert=True)
            return result.acknowledged
        except Exception as e:
            logger.error(f"Error updating growth mindset data: {e}")
            return False

    @staticmethod
    async def get_learning_journey():
        """Get learning journey timeline"""
        try:
            cursor = learning_journey_collection.find().sort("order", 1)
            journey = []
            async for phase in cursor:
                phase["id"] = str(phase["_id"])
                del phase["_id"]
                journey.append(phase)
            return journey
        except Exception as e:
            logger.error(f"Error getting learning journey: {e}")
            return []

    @staticmethod
    async def create_learning_phase(phase_data: dict):
        """Create new learning phase"""
        try:
            result = await learning_journey_collection.insert_one(phase_data)
            return str(result.inserted_id)
        except Exception as e:
            logger.error(f"Error creating learning phase: {e}")
            return None

    @staticmethod
    async def update_learning_phase(phase_id: str, phase_data: dict):
        """Update learning phase"""
        try:
            from bson import ObjectId

            result = await learning_journey_collection.update_one(
                {"_id": ObjectId(phase_id)}, {"$set": phase_data}
            )
            return result.acknowledged
        except Exception as e:
            logger.error(f"Error updating learning phase: {e}")
            return False

    @staticmethod
    async def delete_learning_phase(phase_id: str):
        """Delete learning phase"""
        try:
            from bson import ObjectId

            result = await learning_journey_collection.delete_one(
                {"_id": ObjectId(phase_id)}
            )
            return result.deleted_count > 0
        except Exception as e:
            logger.error(f"Error deleting learning phase: {e}")
            return False

    @staticmethod
    async def get_experiments_section():
        """Get the entire experiments section data"""
        try:
            data = await experiments_collection.find_one()
            if data:
                data["id"] = str(data["_id"])
                del data["_id"]
            return data
        except Exception as e:
            logger.error(f"Error getting experiments section: {e}")
            return None

    @staticmethod
    async def update_experiments_section(data: dict):
        """Update the entire experiments section data"""
        try:
            result = await experiments_collection.replace_one({}, data, upsert=True)
            return result.acknowledged
        except Exception as e:
            logger.error(f"Error updating experiments section: {e}")
            return False

    @staticmethod
    async def get_contact_section():
        """Get contact section data"""
        try:
            data = await contact_section_collection.find_one()
            if data:
                data["id"] = str(data["_id"])
                del data["_id"]
            return data
        except Exception as e:
            logger.error(f"Error getting contact section: {e}")
            return None

    @staticmethod
    async def update_contact_section(data: dict):
        """Update contact section data"""
        try:
            result = await contact_section_collection.replace_one({}, data, upsert=True)
            return result.acknowledged
        except Exception as e:
            logger.error(f"Error updating contact section: {e}")
            return False

    @staticmethod
    async def create_contact_message(message_data: dict):
        """Create new contact message"""
        try:
            result = await contact_messages_collection.insert_one(message_data)
            return str(result.inserted_id)
        except Exception as e:
            logger.error(f"Error creating contact message: {e}")
            return None

    @staticmethod
    async def get_contact_messages():
        """Get all contact messages"""
        try:
            cursor = contact_messages_collection.find().sort("createdAt", -1)
            messages = []
            async for message in cursor:
                message["id"] = str(message["_id"])
                del message["_id"]
                messages.append(message)
            return messages
        except Exception as e:
            logger.error(f"Error getting contact messages: {e}")
            return []

    @staticmethod
    async def mark_message_read(message_id: str):
        """Mark message as read"""
        try:
            from bson import ObjectId

            result = await contact_messages_collection.update_one(
                {"_id": ObjectId(message_id)}, {"$set": {"read": True}}
            )
            return result.acknowledged
        except Exception as e:
            logger.error(f"Error marking message as read: {e}")
            return False

    @staticmethod
    async def delete_contact_message(message_id: str):
        """Delete contact message"""
        try:
            from bson import ObjectId

            result = await contact_messages_collection.delete_one(
                {"_id": ObjectId(message_id)}
            )
            return result.deleted_count > 0
        except Exception as e:
            logger.error(f"Error deleting contact message: {e}")
            return False

    @staticmethod
    async def get_footer():
        """Get footer data"""
        try:
            data = await footer_collection.find_one()
            if data:
                data["id"] = str(data["_id"])
                del data["_id"]
            return data
        except Exception as e:
            logger.error(f"Error getting footer data: {e}")
            return None

    @staticmethod
    async def update_footer(data: dict):
        """Update footer data"""
        try:
            result = await footer_collection.replace_one({}, data, upsert=True)
            return result.acknowledged
        except Exception as e:
            logger.error(f"Error updating footer data: {e}")
            return False

    @staticmethod
    async def create_notification(notification_data: dict):
        """Creates a new notification document"""
        try:
            await notifications_collection.insert_one(notification_data)
            return True
        except Exception as e:
            logger.error(f"Error creating notification: {e}")
            return False

    @staticmethod
    async def get_notifications(limit: int = 100):
        """Gets the most recent notifications"""
        cursor = notifications_collection.find().sort("createdAt", -1).limit(limit)
        notifications = []
        async for doc in cursor:
            doc["id"] = str(doc["_id"])
            del doc["_id"]
            notifications.append(doc)
        return notifications

    @staticmethod
    async def mark_notification_as_read(notification_id: str):
        """Marks a single notification as read by its ID."""
        try:
            # Convert the string ID to a MongoDB ObjectId
            obj_id = ObjectId(notification_id)
            result = await notifications_collection.update_one(
                {"_id": obj_id},
                {"$set": {"read": True}}
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(
                f"Error marking notification {notification_id} as read: {e}")
            return False

    @staticmethod
    async def mark_notifications_as_read():
        """Marks all unread notifications as read"""
        # Change the filter from {"read": False} to {"read": {"$ne": True}}
        # This finds documents where 'read' is false OR where the 'read' field doesn't exist at all.
        await notifications_collection.update_many(
            {"read": {"$ne": True}},
            {"$set": {"read": True}}
        )
        return True

    @staticmethod
    async def delete_all_notifications():
        """Deletes all notifications from the collection."""
        try:
            await notifications_collection.delete_many({})
            return True
        except Exception as e:
            logger.error(f"Error deleting all notifications: {e}")
            return False

    @staticmethod
    async def get_admin_by_username(username: str):
        """Get admin by username"""
        try:
            admin = await admin_collection.find_one({"username": username})
            if admin:
                admin["id"] = str(admin["_id"])
                del admin["_id"]
            return admin
        except Exception as e:
            logger.error(f"Error getting admin: {e}")
            return None

    @staticmethod
    async def get_admins():
        """Get all admin users, excluding their passwords"""
        try:
            # {"password": 0} excludes the password field
            cursor = admin_collection.find({}, {"password": 0})
            admins = []
            async for admin in cursor:
                admin["id"] = str(admin["_id"])
                del admin["_id"]
                admins.append(admin)
            return admins
        except Exception as e:
            logger.error(f"Error getting admins: {e}")
            return []

    @staticmethod
    async def create_admin(admin_data: dict):
        """Create new admin"""
        try:
            result = await admin_collection.insert_one(admin_data)
            return str(result.inserted_id)
        except Exception as e:
            logger.error(f"Error creating admin: {e}")
            return None

    @staticmethod
    async def delete_admin(username: str):
        """Deletes an admin by username"""
        try:
            result = await admin_collection.delete_one({"username": username})
            return result.deleted_count > 0
        except Exception as e:
            logger.error(f"Error deleting admin {username}: {e}")
            return False
