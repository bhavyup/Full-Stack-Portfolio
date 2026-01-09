from models import Profile, AdminProfileResponse
from fastapi import FastAPI, APIRouter, HTTPException, status, Depends
from fastapi.staticfiles import StaticFiles
from fastapi import File, UploadFile
import shutil
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from datetime import timedelta
from models import Profile
from contextlib import asynccontextmanager

# Import our models and database
from models import *
from database import Database, notifications_collection
from auth import authenticate_admin, create_access_token, get_current_admin, get_password_hash

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Create the main app without a prefix


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Code here runs on startup
    print("--- Running startup tasks ---")
    await Database.create_indexes()
    yield
    # Code here runs on shutdown (not needed for this)
    print("--- Running shutdown tasks ---")

# Pass the lifespan function to your FastAPI app instance
app = FastAPI(title="Bhavy Portfolio API",
              version="1.0.0", lifespan=lifespan)

UPLOAD_DIR = ROOT_DIR / "static"
UPLOAD_DIR.mkdir(exist_ok=True)

# Mount the static directory to serve files from /static URL
app.mount("/static", StaticFiles(directory=UPLOAD_DIR), name="static")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============================================================================
# PUBLIC API ROUTES (No Authentication Required)
# ============================================================================


@api_router.get("/")
async def root():
    return {"message": "Portfolio API is running", "status": "success"}

# Profile Routes


@api_router.get("/profile")
async def get_profile():
    """Get profile data"""
    try:
        profile = await Database.get_profile()
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")
        return {"success": True, "data": profile}
    except Exception as e:
        logger.error(f"Error getting profile: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Skills Routes


@api_router.get("/skills")
async def get_skills():
    """Get all skills by category"""
    try:
        skills = await Database.get_skills()
        return {"success": True, "data": skills}
    except Exception as e:
        logger.error(f"Error getting skills: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@api_router.get("/projects/content", response_model=ProjectsPage)
async def get_projects_page_content():
    """
    Retrieve the header content (subtitle and tip) for the projects page.
    """
    content = await Database.get_projects_page()
    if content:
        return content
    raise HTTPException(
        status_code=404, detail="Projects page content not found")

# Projects Routes


@api_router.get("/projects")
async def get_projects():
    """Get all projects"""
    try:
        projects = await Database.get_projects()
        return {"success": True, "data": projects, "total": len(projects)}
    except Exception as e:
        logger.error(f"Error getting projects: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Education Routes


@api_router.get("/education")
async def get_education_list():
    """Get all education entries"""
    try:
        education_list = await Database.get_all_education()
        return {"success": True, "data": education_list}
    except Exception as e:
        logger.error(f"Error getting education: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Experience Routes

    
@api_router.get("/experience")
async def get_experience_list():
    """Get all experience entries"""
    try:
        experience_list = await Database.get_all_experience()
        if not experience_list:
            raise HTTPException(
                status_code=404, detail="Experience list not found")
        return {"success": True, "data": experience_list}
    except Exception as e:
        logger.error(f"Error getting experience list: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Learning Journey Routes


@api_router.get("/learning-journey")
async def get_learning_journey():
    """Get learning journey timeline"""
    try:
        journey = await Database.get_learning_journey()
        print("--- JOURNEY DATA FROM DB:", journey)
        return {"success": True, "data": journey, "total": len(journey)}
    except Exception as e:
        logger.error(f"Error getting learning journey: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@api_router.get("/growth-mindset")
async def get_growth_mindset():
    """Get growth mindset data"""
    try:
        data = await Database.get_growth_mindset()
        if not data:
            raise HTTPException(status_code=404, detail="Data not found")
        return {"success": True, "data": data}
    except Exception as e:
        logger.error(f"Error getting growth mindset data: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Experiments Routes


@api_router.get("/experiments")
async def get_experiments_section():
    """Get the entire experiments section data"""
    try:
        data = await Database.get_experiments_section()
        if not data:
            raise HTTPException(
                status_code=404, detail="Experiments section not found")
        return {"success": True, "data": data}
    except Exception as e:
        logger.error(f"Error getting experiments section: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@api_router.get("/contact-section")
async def get_contact_section():
    """Get contact section data"""
    data = await Database.get_contact_section()
    if not data:
        raise HTTPException(
            status_code=404, detail="Contact section data not found")
    return {"success": True, "data": data}

# Contact Routes


@api_router.post("/contact")
async def submit_contact_form(contact_data: ContactMessageCreate):
    """Submit contact form"""
    try:
        message_dict = contact_data.dict()
        message_obj = ContactMessage(**message_dict)
        message_id = await Database.create_contact_message(message_obj.dict())

        if message_id:
            await Database.create_notification(
                {
                    "message": f"New message from {contact_data.name}: {contact_data.message}",
                    "type": NotificationType.MESSAGE,
                    "read": False,
                    "createdAt": datetime.utcnow(),
                }
            )
            return {"success": True, "message": "Message sent successfully!", "id": message_id}
        else:
            await Database.create_notification(
                {
                    "message": f"{contact_data.name}({contact_data.email}) Failed to send message from contact form.",
                    "type": NotificationType.ERROR,
                    "read": False,
                    "createdAt": datetime.utcnow(),
                }
            )

            raise HTTPException(
                status_code=500, detail="Failed to send message"
            )
    except Exception as e:
        logger.error(f"Error submitting contact form: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@api_router.get("/footer")
async def get_footer():
    """Get footer data"""
    try:
        data = await Database.get_footer()
        if not data:
            raise HTTPException(
                status_code=404, detail="Footer data not found")
        return {"success": True, "data": data}
    except Exception as e:
        logger.error(f"Error getting footer data: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
    
    
    
    
    
    

# =====================================================================================================================================================================================
#                _____                ___________                              ________  ___________        _________     ________                _____________  __________                                                     
#       /\      |     \    |\      /|      |      |\     |            /\      |        |      |            |         |   /        \  |          |       |       |
#      /  \     |      \   | \    / |      |      | \    |           /  \     |        |      |            |         |  |          | |          |       |       |
#     /    \    |       \  |  \  /  |      |      |  \   |          /    \    |________|      |            |_________|  |          | |          |       |       |_________
#    /______\   |       /  |   \/   |      |      |   \  |         /______\   |               |            |       \    |          | |          |       |       |
#   /        \  |      /   |        |      |      |    \ |        /        \  |               |            |        \   |          | |          |       |       |
#  /          \ |_____/    |        | _____|_____ |     \|       /          \ |          _____|_____       |         \   \________/   \________/        |       |__________
#
# =====================================================================================================================================================================================






#<-------------------------------------------------------------------- Admin Authentication Management ----------------------------------------------------------------------------------->
 
# Admin Login Route
@api_router.post("/admin/login", response_model=Token)
async def admin_login(login_data: AdminLogin):
    try:
        admin = await authenticate_admin(login_data.username, login_data.password) 
        if not admin:
            await Database.create_notification({
                "message": f"ERROR Login Attempt: {login_data.username} failed to log in",
                "type": NotificationType.ERROR,
                "read": False,
                "createdAt": datetime.utcnow(),
            })
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        access_token_expires = timedelta(minutes=10)
        access_token = create_access_token(
            data={"sub": admin["username"]}, expires_delta=access_token_expires
        )
        await Database.create_notification({
            "message": f"SUCCESS Login: Admin {login_data.username} logged in",
            "type": NotificationType.SECURITY,
            "read": False,
            "createdAt": datetime.utcnow(),
        })
        return {"access_token": access_token, "token_type": "bearer"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during admin login: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Token Verification Route
@api_router.get("/admin/verify")
async def verify_admin_token(current_admin: dict = Depends(get_current_admin)):
    return {"success": True, "admin": {"username": current_admin["username"]}}

# Logged-in Admin Profile Route
@api_router.get("/admin/me", response_model=AdminProfileResponse)
async def get_logged_in_admin_profile(current_admin: dict = Depends(get_current_admin)):
    return current_admin






#<---------------------------------------------------------------------- Admin User Management --------------------------------------------------------------------------------------->

# Create new admin user
@api_router.post("/admin/users", status_code=status.HTTP_201_CREATED)
async def create_new_admin(admin_data: AdminCreate, current_admin: dict = Depends(get_current_admin)):
    existing_admin = await Database.get_admin_by_username(admin_data.username)
    if existing_admin:
        await Database.create_notification(
            {
                "message": f"WARNING Admin Creation: hey {current_admin['username']}, Admin {admin_data.username} already exists",
                "type": NotificationType.WARNING,
                "read": False,
                "createdAt": datetime.utcnow(),
            }
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered",
        )
    hashed_password = get_password_hash(admin_data.password)
    new_admin_data = {
        "username": admin_data.username,
        "password": hashed_password,
        "name": admin_data.name,
        "profileImage": admin_data.profileImage,
        "role": "admin", 
        "createdAt": datetime.utcnow()
    }
    admin_id = await Database.create_admin(new_admin_data)
    if not admin_id:
        await Database.create_notification(
            {
                "message": f"ERROR Admin Creation: {current_admin['username']} Failed to create new admin {admin_data.username}",
                "type": NotificationType.ERROR,
                "read": False,
                "createdAt": datetime.utcnow(),
            }
        )
        raise HTTPException(status_code=500, detail="Failed to create admin")

    await Database.create_notification(
        {
            "message": f"SUCCESS Admin Creation: New Admin {admin_data.username} created by {current_admin['username']}",
            "type": NotificationType.SUCCESS,
            "read": False,
            "createdAt": datetime.utcnow(),
        })
    return {"success": True, "message": "Admin created successfully", "id": admin_id}

# Delete an admin user
@api_router.delete("/admin/users/{username}")
async def delete_admin_user(username: str, current_admin: dict = Depends(get_current_admin)):
    if current_admin.get("role") != "superadmin":
        await Database.create_notification({
            "message": f"ERROR Admin Deletion: Admin {current_admin['username']} attempted to delete admin {username} || Permission Denied",
            "type": NotificationType.ERROR,
            "read": False,
            "createdAt": datetime.utcnow(),
        })
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to perform this action.",
        )
    if username == current_admin["username"]:
        await Database.create_notification({
            "message": f"WARNING Admin Deletion: Hey {current_admin['username']}, you cannot delete your own account",
            "type": NotificationType.WARNING,
            "read": False,
            "createdAt": datetime.utcnow(),
        })
        raise HTTPException(
            status_code=400, detail="You cannot delete your own account.")

    success = await Database.delete_admin(username)
    if not success:
        await Database.create_notification({
            "message": f"ERROR Admin Deletion: {current_admin['username']} Failed to delete admin {username} || Admin Not Found",
            "type": NotificationType.ERROR,
            "read": False,
            "createdAt": datetime.utcnow(),
        })
        raise HTTPException(status_code=404, detail="Admin not found")

    await Database.create_notification(
        {
            "message": f"SUCCESS Admin Deletion: Admin {username} deleted by {current_admin['username']}",
            "type": NotificationType.INFO,
            "read": False,
            "createdAt": datetime.utcnow(),
        }
    )
    return {"success": True, "message": "Admin deleted successfully"}

# List all admin users
@api_router.get("/admin/users")
async def list_admin_users(current_admin: dict = Depends(get_current_admin)):
    admins = await Database.get_admins()
    return {"success": True, "data": admins}








#<-------------------------------------------------------------------- Admin Dashboard Helpers ----------------------------------------------------------------------------------->

# Site-wide Search for Admin Panel
@api_router.get("/admin/search")
async def search_content(q: str, current_admin: dict = Depends(get_current_admin)):
    if not q:
        raise HTTPException(
            status_code=400, detail="Search query cannot be empty")
    results = await Database.search_content(q)
    return {"success": True, "data": results}

# Dashboard Summary
@api_router.get("/admin/dashboard-summary")
async def get_dashboard_summary(current_admin: dict = Depends(get_current_admin)):
    try:
        projects = await Database.get_projects()
        messages = await Database.get_contact_messages()
        skills = await Database.get_skills()

        unread_messages = [m for m in messages if not m.get('read', False)]

        unread_notification_count = await notifications_collection.count_documents({"read": False})

        summary = {
            "project_count": len(projects),
            "message_count": len(messages),
            "unread_message_count": len(unread_messages),
            "skill_category_count": len(skills.keys()),
            "recent_messages": unread_messages[:5],
            "unread_notification_count": unread_notification_count,
        }
        return {"success": True, "data": summary}
    except Exception as e:
        logger.error(f"Error getting dashboard summary: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
    
    
    
    
    


#<-------------------------------------------------------------------- Admin Resume Helper ----------------------------------------------------------------------------------->

# Upload Resume File
@api_router.post("/admin/upload-resume")
async def upload_resume(file: UploadFile = File(...), current_admin: dict = Depends(get_current_admin)):
    try:
        file_path = UPLOAD_DIR / file.filename

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        file_url = f"/static/{file.filename}"
        await Database.create_notification({
            "message": f"UPDATE Profile: Admin {current_admin['username']} made changes in Resume.",
            "type": NotificationType.UPDATE,
            "read": False,
            "createdAt": datetime.utcnow(),
        })
        return {"success": True, "message": "File uploaded successfully", "url": file_url}
    except Exception as e:
        await Database.create_notification({
            "message": f"ERROR Profile: Admin {current_admin['username']} failed to upload resume.",
            "type": NotificationType.ERROR,
            "read": False,
            "createdAt": datetime.utcnow(),
        })
        logger.error(f"Error uploading resume: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload file")
    
    
    
    
    
    

#<-------------------------------------------------------------------- Admin Profile Management ----------------------------------------------------------------------------------->

# Update profile data
@api_router.put("/admin/profile")
async def update_profile(profile_data: ProfileBase, current_admin: dict = Depends(get_current_admin)):
    try:
        profile_dict = profile_data.dict()
        profile_obj = Profile(**profile_dict)
        success = await Database.update_profile(profile_obj.dict())

        if success:
            await Database.create_notification({
                "message": f"SUCCESS UPDATE Profile: Admin {current_admin['username']} made changes in Profile Section.",
                "type": NotificationType.UPDATE,
                "read": False,
                "createdAt": datetime.utcnow(),
            })
            return {"success": True, "message": "Profile updated successfully"}
        else:
            await Database.create_notification({
                "message": f"ERROR Profile: Admin {current_admin['username']} failed to update profile.",
                "type": NotificationType.ERROR,
                "read": False,
                "createdAt": datetime.utcnow(),
            })
            raise HTTPException(
                status_code=500, detail="Failed to update profile")
    except Exception as e:
        logger.error(f"Error updating profile: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
    
    
    
    
    

#<-------------------------------------------------------------------- Admin Skills Management ----------------------------------------------------------------------------------->

# Update skills for a specific category
@api_router.put("/admin/skills/{category}", status_code=status.HTTP_200_OK)
async def update_skills(category: str, skills: List[Skill], current_admin: dict = Depends(get_current_admin)):
    try:
        skills_as_dicts = [skill.dict() for skill in skills]

        success = await Database.update_skills(category, skills_as_dicts)

        if success:
            await Database.create_notification({
                "message": f"SUCCESS UPDATE Skills: Admin {current_admin['username']} made changes in Skills Category {category}.",
                "type": NotificationType.UPDATE,
                "read": False,
                "createdAt": datetime.utcnow(),
            })
            return {"success": True, "message": f"Skills for {category} updated successfully"}
        else:
            await Database.create_notification({
                "message": f"ERROR Skills: Admin {current_admin['username']} failed to update skills for category {category}.",
                "type": NotificationType.ERROR,
                "read": False,
                "createdAt": datetime.utcnow(),
            })
            raise HTTPException(
                status_code=500, detail="Failed to update skills")

    except Exception as e:
        logger.error(f"Error updating skills for category {category}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Delete entire skills category
@api_router.delete("/admin/skills/{category}")
async def delete_skills_category(category: str, current_admin: dict = Depends(get_current_admin)):
    try:
        success = await Database.delete_skills_category(category)
        if success:
            await Database.create_notification({
                "message": f"SUCCESS Skills: Admin {current_admin['username']} deleted category {category}.",
                "type": NotificationType.SUCCESS,
                "read": False,
                "createdAt": datetime.utcnow(),
            })
            return {"success": True, "message": f"Category '{category}' deleted successfully"}
        else:
            await Database.create_notification({
                "message": f"ERROR Skills: Admin {current_admin['username']} failed to delete category {category}.",
                "type": NotificationType.ERROR,
                "read": False,
                "createdAt": datetime.utcnow(),
            })
            raise HTTPException(
                status_code=404, detail="Category not found or could not be deleted")
    except Exception as e:
        logger.error(f"Error deleting category: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
    
    
    
    
    
    

#<-------------------------------------------------------------------- Admin Project Management ----------------------------------------------------------------------------------->

# Projects Page Content Update
@api_router.put("/admin/projects/content", status_code=status.HTTP_200_OK)
async def update_projects_page_content_route(
    data: ProjectsPageUpdate,
    current_admin: dict = Depends(get_current_admin)
):
    try:
        update_data = data.dict(exclude_unset=True)
        if not update_data:
            await Database.create_notification({
                "message": f"ERROR UPDATE: Admin {current_admin['username']} tried updating the Projects page header.",
                "type": NotificationType.ERROR,
                "read": False,
                "createdAt": datetime.utcnow(),
                })
            raise HTTPException(
                status_code=400, detail="No update data provided.")
        await Database.update_projects_page_content(update_data)
        # You can add a notification here if you want
        await Database.create_notification({
            "message": f"SUCCESS UPDATE: Admin {current_admin['username']} updated the Projects page header.",
            "type": NotificationType.UPDATE,
            "read": False,
            "createdAt": datetime.utcnow(),
        })

        return {"success": True, "message": "Projects page content updated successfully."}
    except Exception as e:
        logger.error(f"Error updating projects page content: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
    

# Project Creation
@api_router.post("/admin/projects")
async def create_project(project_data: ProjectCreate, current_admin: dict = Depends(get_current_admin)):
    try:
        project_dict = project_data.dict()
        project_obj = Project(**project_dict)
        project_id = await Database.create_project(project_obj.dict())

        if project_id:
            await Database.create_notification({
                "message": f"SUCCESS Project: Admin {current_admin['username']} created new project named {project_data.title}.",
                "type": NotificationType.SUCCESS,
                "read": False,
                "createdAt": datetime.utcnow(),
            })
            return {"success": True, "message": "Project created successfully", "id": project_id}
        else:
            await Database.create_notification({
                "message": f"ERROR Project: Admin {current_admin['username']} failed to create new project.",
                "type": NotificationType.ERROR,
                "read": False,
                "createdAt": datetime.utcnow(),
            })
            raise HTTPException(
                status_code=500, detail="Failed to create project")
    except Exception as e:
        logger.error(f"Error creating project: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Project Update
@api_router.put("/admin/projects/{project_id}")
async def update_project(project_id: str, project_data: ProjectUpdate, current_admin: dict = Depends(get_current_admin)):
    try:
        update_dict = {k: v for k, v in project_data.dict().items()
                       if v is not None}
        if update_dict:
            update_dict["updatedAt"] = datetime.utcnow()
            success = await Database.update_project(project_id, update_dict)

            if success:
                await Database.create_notification({
                    "message": f"SUCCESS UPDATE Project: Admin {current_admin['username']} updated project named {project_data.title}.",
                    "type": NotificationType.UPDATE,
                    "read": False,
                    "createdAt": datetime.utcnow(),
                })
                return {"success": True, "message": "Project updated successfully"}
            else:
                await Database.create_notification({
                    "message": f"ERROR Project: Admin {current_admin['username']} failed to update unknown project.",
                    "type": NotificationType.ERROR,
                    "read": False,
                    "createdAt": datetime.utcnow(),
                })
                raise HTTPException(
                    status_code=404, detail="Project not found")
        else:
            await Database.create_notification({
                "message": f"WARNING Project: Admin {current_admin['username']}, nothing to update in project named {project_data.title}.",
                "type": NotificationType.WARNING,
                "read": False,
                "createdAt": datetime.utcnow(),
            })
            raise HTTPException(status_code=400, detail="No data to update")
    except Exception as e:
        logger.error(f"Error updating project: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Project Deletion
@api_router.delete("/admin/projects/{project_id}")
async def delete_project(project_id: str, current_admin: dict = Depends(get_current_admin)):
    try:
        success = await Database.delete_project(project_id)

        if success:
            await Database.create_notification({
                "message": f"SUCCESS Project: Admin {current_admin['username']} deleted project with ID {project_id}.",
                "type": NotificationType.SUCCESS,
                "read": False,
                "createdAt": datetime.utcnow(),
            })
            return {"success": True, "message": "Project deleted successfully"}
        else:
            await Database.create_notification({
                "message": f"ERROR Project: Admin {current_admin['username']} failed to delete project with ID {project_id}. || Project Not Found",
                "type": NotificationType.ERROR,
                "read": False,
                "createdAt": datetime.utcnow(),
            })
            raise HTTPException(status_code=404, detail="Project not found")
    except Exception as e:
        logger.error(f"Error deleting project: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
    
    
    
    
    
    

#<-------------------------------------------------------------------- Admin Education Management ----------------------------------------------------------------------------------->
    
    
# Education Entry Creation
@api_router.post("/admin/education", status_code=status.HTTP_201_CREATED)
async def create_education_entry(education_data: EducationCreate, current_admin: dict = Depends(get_current_admin)):
    try:
        education_id = await Database.create_education(education_data.dict())
        if education_id:
            await Database.create_notification({
                "message": f"SUCCESS CREATE Education: Admin {current_admin['username']} created a new education entry.",
                "type": NotificationType.CREATE,
                "read": False,
                "createdAt": datetime.utcnow(),
            })
            return {"success": True, "message": "Education entry created", "id": education_id}
        await Database.create_notification({
                "message": f"ERROR CREATE Education: Admin {current_admin['username']} failed to create a new education entry.",
                "type": NotificationType.ERROR,
                "read": False,
                "createdAt": datetime.utcnow(),
            })
        raise HTTPException(status_code=500, detail="Failed to create education entry")
    except Exception as e:
        logger.error(f"Error creating education entry: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


# Education Entry Update
@api_router.put("/admin/education/{education_id}")
async def update_education_entry(education_id: str, education_data: EducationUpdate, current_admin: dict = Depends(get_current_admin)):
    try:
        update_dict = education_data.dict(exclude_unset=True)
        if not update_dict:
            await Database.create_notification({
                "message": f"WARNING Education: Admin {current_admin['username']} tried making empty changes in Education Section.",
                "type": NotificationType.WARNING,
                "read": False,
                "createdAt": datetime.utcnow(),
            })
            raise HTTPException(status_code=400, detail="No update data provided")
        
        success = await Database.update_education(education_id, update_dict)
        if success:
            await Database.create_notification({
                    "message": f"SUCCESS UPDATE Education: Admin {current_admin['username']} made changes in Education Section.",
                    "type": NotificationType.UPDATE,
                    "read": False,
                    "createdAt": datetime.utcnow(),
                })
            return {"success": True, "message": "Education entry updated"}
        await Database.create_notification({
                    "message": f"ERROR Education: Admin {current_admin['username']} failed to update education.",
                    "type": NotificationType.ERROR,
                    "read": False,
                    "createdAt": datetime.utcnow(),
                })
        raise HTTPException(status_code=404, detail="Education entry not found or failed to update")
    except Exception as e:
        logger.error(f"Error updating education entry: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


# Education Entry Deletion
@api_router.delete("/admin/education/{education_id}")
async def delete_education_entry(education_id: str, current_admin: dict = Depends(get_current_admin)):
    try:
        success = await Database.delete_education(education_id)
        if success:
            await Database.create_notification({
                "message": f"SUCCESS DELETE Education: Admin {current_admin['username']} deleted education entry with ID {education_id}.",
                "type": NotificationType.SUCCESS,
                "read": False,
                "createdAt": datetime.utcnow(),
            })
            return {"success": True, "message": "Education entry deleted"}
        await Database.create_notification({
                "message": f"ERROR DELETE Education: Admin {current_admin['username']} failed to delete education entry with ID {education_id}. || Education Entry Not Found",
                "type": NotificationType.ERROR,
                "read": False,
                "createdAt": datetime.utcnow(),
        })
        raise HTTPException(status_code=404, detail="Education entry not found or failed to delete")
    except Exception as e:
        logger.error(f"Error deleting education entry: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
    
    
    
    
    

#<-------------------------------------------------------------------- Admin Experience Management ----------------------------------------------------------------------------------->
    
# Create Experience Entry
@api_router.post("/admin/experience", status_code=status.HTTP_201_CREATED)
async def create_experience_entry(exp_data: ExperienceCreate, current_admin: dict = Depends(get_current_admin)):
    try:
        exp_id = await Database.create_experience(exp_data.dict())
        if exp_id:
            await Database.create_notification({
                "message": f"SUCCESS CREATE Experience: Admin {current_admin['username']} created a new experience entry.",
                "type": NotificationType.CREATE,
                "read": False,
                "createdAt": datetime.utcnow(),
            })
            return {"success": True, "message": "Experience entry created successfully", "id": exp_id}
        else:
            await Database.create_notification({
                "message": f"ERROR CREATE Experience: Admin {current_admin['username']} failed to create a new experience entry.",
                "type": NotificationType.ERROR,
                "read": False,
                "createdAt": datetime.utcnow(),
            })
            raise HTTPException(status_code=500, detail="Failed to create experience entry")
    except Exception as e:
        logger.error(f"Error creating experience entry: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Update Experience Entry
@api_router.put("/admin/experience/{experience_id}")
async def update_experience_entry(experience_id: str, exp_data: ExperienceUpdate, current_admin: dict = Depends(get_current_admin)):
    try:
        update_dict = exp_data.dict(exclude_unset=True)
        if not update_dict:
            await Database.create_notification({
                "message": f"WARNING Experience: Admin {current_admin['username']} tried making empty changes in Experience Section.",
                "type": NotificationType.WARNING,
                "read": False,
                "createdAt": datetime.utcnow(),
            })
            raise HTTPException(status_code=400, detail="No update data provided")
        success = await Database.update_experience(experience_id, update_dict)
        if success:
            await Database.create_notification({
                "message": f"SUCCESS UPDATE Experience: Admin {current_admin['username']} made changes in Experience Section.",
                "type": NotificationType.UPDATE,
                "read": False,
                "createdAt": datetime.utcnow(),
            })
            return {"success": True, "message": "Experience entry updated successfully"}
        else:
            await Database.create_notification({
                "message": f"ERROR Experience: Admin {current_admin['username']} failed to update experience.",
                "type": NotificationType.ERROR,
                "read": False,
                "createdAt": datetime.utcnow(),
            })
            raise HTTPException(status_code=404, detail="Experience entry not found or failed to update")
    except Exception as e:
        logger.error(f"Error updating experience entry: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Delete Experience Entry
@api_router.delete("/admin/experience/{experience_id}")
async def delete_experience_entry(experience_id: str, current_admin: dict = Depends(get_current_admin)):
    try:
        success = await Database.delete_experience(experience_id)
        if success:
            await Database.create_notification({
                "message": f"SUCCESS DELETE Experience: Admin {current_admin['username']} deleted experience entry with ID {experience_id}.",
                "type": NotificationType.SUCCESS,
                "read": False,
                "createdAt": datetime.utcnow(),
            })
            return {"success": True, "message": "Experience entry deleted successfully"}
        else:
            await Database.create_notification({
                "message": f"ERROR DELETE Experience: Admin {current_admin['username']} failed to delete experience entry with ID {experience_id}. || Experience Entry Not Found",
                "type": NotificationType.ERROR,
                "read": False,
                "createdAt": datetime.utcnow(),
            })
            raise HTTPException(status_code=404, detail="Experience entry not found")
    except Exception as e:
        logger.error(f"Error deleting experience entry: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
    
    
    
    
#<-------------------------------------------------------------------- Admin Learning Journey Management ----------------------------------------------------------------------------------->


@api_router.post("/admin/learning-journey", status_code=status.HTTP_201_CREATED)
async def create_learning_phase(phase_data: LearningJourneyCreate, current_admin: dict = Depends(get_current_admin)):
    """Create a new learning journey phase"""
    try:
        phase_dict = phase_data.dict()
        phase_id = await Database.create_learning_phase(phase_dict)
        if phase_id:
            await Database.create_notification({
                "message": f"SUCCESS Learning Journey: Admin {current_admin['username']} created new learning phase {phase_data.phase}.",
                "type": NotificationType.SUCCESS,
                "read": False,
                "createdAt": datetime.utcnow(),
            })
            return {"success": True, "message": "Phase created successfully", "id": phase_id}
        await Database.create_notification({
            "message": f"ERROR Learning Journey: Admin {current_admin['username']} failed to create learning phase {phase_data.phase}.",
            "type": NotificationType.ERROR,
            "read": False,
            "createdAt": datetime.utcnow(),
        })
        raise HTTPException(status_code=500, detail="Failed to create phase")
    except Exception as e:
        logger.error(f"Error creating learning phase: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@api_router.put("/admin/learning-journey/{phase_id}")
async def update_learning_phase(phase_id: str, phase_data: LearningJourneyUpdate, current_admin: dict = Depends(get_current_admin)):
    """Update a learning journey phase"""
    try:
        update_dict = {k: v for k, v in phase_data.dict().items()
                       if v is not None}
        if not update_dict:
            raise HTTPException(status_code=400, detail="No data to update")

        update_dict["updatedAt"] = datetime.utcnow()
        success = await Database.update_learning_phase(phase_id, update_dict)
        if success:
            await Database.create_notification({
                "message": f"SUCCESS UPDATE Learning Journey: Admin {current_admin['username']} made changes in phase {phase_data.phase}.",
                "type": NotificationType.UPDATE,
                "read": False,
                "createdAt": datetime.utcnow(),
            })
            return {"success": True, "message": "Phase updated successfully"}
        await Database.create_notification({
            "message": f"ERROR Learning Journey: Admin {current_admin['username']} failed to update learning phase {phase_data.phase}.",
            "type": NotificationType.ERROR,
            "read": False,
            "createdAt": datetime.utcnow(),
        })
        raise HTTPException(status_code=404, detail="Phase not found")
    except Exception as e:
        logger.error(f"Error updating learning phase: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@api_router.delete("/admin/learning-journey/{phase_id}")
async def delete_learning_phase(phase_id: str, current_admin: dict = Depends(get_current_admin)):
    """Delete a learning journey phase"""
    try:
        success = await Database.delete_learning_phase(phase_id)
        if success:
            await Database.create_notification({
                "message": f"SUCCESS DELETE Learning Journey: Admin {current_admin['username']} deleted phase with ID {phase_id}.",
                "type": NotificationType.SUCCESS,
                "read": False,
                "createdAt": datetime.utcnow(),
            })
            return {"success": True, "message": "Phase deleted successfully"}
        await Database.create_notification({
            "message": f"ERROR Learning Journey: Admin {current_admin['username']} failed to delete learning phase with ID {phase_id}. || Phase Not Found",
            "type": NotificationType.ERROR,
            "read": False,
            "createdAt": datetime.utcnow(),
        })
        raise HTTPException(status_code=404, detail="Phase not found")
    except Exception as e:
        logger.error(f"Error deleting learning phase: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@api_router.put("/admin/growth-mindset")
async def update_growth_mindset(data: GrowthMindsetBase, current_admin: dict = Depends(get_current_admin)):
    """Update growth mindset data"""
    try:
        success = await Database.update_growth_mindset(data.dict())
        if success:
            await Database.create_notification({
                "message": f"SUCCESS UPDATE Growth Mindset: Admin {current_admin['username']} made changes in Growth Mindset Section.",
                "type": NotificationType.UPDATE,
                "read": False,
                "createdAt": datetime.utcnow(),
            })
            return {"success": True, "message": "Growth mindset section updated"}
        await Database.create_notification({
            "message": f"ERROR Growth Mindset: Admin {current_admin['username']} failed to update growth mindset.",
            "type": NotificationType.ERROR,
            "read": False,
            "createdAt": datetime.utcnow(),
        })
        raise HTTPException(status_code=500, detail="Failed to update data")
    except Exception as e:
        logger.error(f"Error updating growth mindset: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@api_router.put("/admin/experiments")
async def update_experiments_section(data: ExperimentsSectionData, current_admin: dict = Depends(get_current_admin)):
    """Update the entire experiments section"""
    try:
        success = await Database.update_experiments_section(data.dict())
        if success:
            await Database.create_notification({
                "message": f"SUCCESS UPDATE Experiments: Admin {current_admin['username']} made changes in Experiments Section.",
                "type": NotificationType.UPDATE,
                "read": False,
                "createdAt": datetime.utcnow(),
            })
            return {"success": True, "message": "Experiments section updated successfully"}
        await Database.create_notification({
            "message": f"ERROR Experiments: Admin {current_admin['username']} failed to update experiments section.",
            "type": NotificationType.ERROR,
            "read": False,
            "createdAt": datetime.utcnow(),
        })
        raise HTTPException(
            status_code=500, detail="Failed to update experiments section")
    except Exception as e:
        logger.error(f"Error updating experiments section: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@api_router.put("/admin/contact-section")
async def update_contact_section(data: ContactSectionData, current_admin: dict = Depends(get_current_admin)):
    """Update contact section data"""
    success = await Database.update_contact_section(data.dict())
    if success:
        await Database.create_notification({
            "message": f"SUCCESS UPDATE Contact: Admin {current_admin['username']} made changes in Contact Section.",
            "type": NotificationType.UPDATE,
            "read": False,
            "createdAt": datetime.utcnow(),
        })
        return {"success": True, "message": "Contact section updated"}
    await Database.create_notification({
        "message": f"ERROR Contact: Admin {current_admin['username']} failed to update contact section.",
        "type": NotificationType.ERROR,
        "read": False,
        "createdAt": datetime.utcnow(),
    })
    raise HTTPException(
        status_code=500, detail="Failed to update contact section")

# Admin Messages Management


@api_router.get("/admin/messages")
async def get_contact_messages(current_admin: dict = Depends(get_current_admin)):
    """Get all contact messages"""
    try:
        messages = await Database.get_contact_messages()
        return {"success": True, "data": messages, "total": len(messages)}
    except Exception as e:
        logger.error(f"Error getting contact messages: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@api_router.put("/admin/messages/{message_id}/read")
async def mark_message_read(message_id: str, current_admin: dict = Depends(get_current_admin)):
    """Mark message as read"""
    try:
        success = await Database.mark_message_read(message_id)

        if success:
            await Database.create_notification({
                "message": f"SUCCESS UPDATE Messages: Admin {current_admin['username']} marked message with ID {message_id} as read.",
                "type": NotificationType.UPDATE,
                "read": False,
                "createdAt": datetime.utcnow(),
            })
            return {"success": True, "message": "Message marked as read"}
        else:
            await Database.create_notification({
                "message": f"ERROR Messages: Admin {current_admin['username']} failed to mark message with ID {message_id} as read.",
                "type": NotificationType.ERROR,
                "read": False,
                "createdAt": datetime.utcnow(),
            })
            raise HTTPException(status_code=404, detail="Message not found")
    except Exception as e:
        logger.error(f"Error marking message as read: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@api_router.delete("/admin/messages/{message_id}")
async def delete_contact_message(message_id: str, current_admin: dict = Depends(get_current_admin)):
    """Delete contact message"""
    try:
        success = await Database.delete_contact_message(message_id)

        if success:
            await Database.create_notification({
                "message": f"SUCCESS DELETE Messages: Admin {current_admin['username']} deleted message with ID {message_id}.",
                "type": NotificationType.SUCCESS,
                "read": False,
                "createdAt": datetime.utcnow(),
            })
            return {"success": True, "message": "Message deleted successfully"}
        else:
            await Database.create_notification({
                "message": f"ERROR Messages: Admin {current_admin['username']} failed to delete message with ID {message_id}. || Message Not Found",
                "type": NotificationType.ERROR,
                "read": False,
                "createdAt": datetime.utcnow(),
            })
            raise HTTPException(status_code=404, detail="Message not found")
    except Exception as e:
        logger.error(f"Error deleting message: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@api_router.put("/admin/footer")
async def update_footer(data: FooterData, current_admin: dict = Depends(get_current_admin)):
    """Update footer data"""
    try:
        success = await Database.update_footer(data.dict())
        if success:
            await Database.create_notification({
                "message": f"SUCCESS UPDATE Footer: Admin {current_admin['username']} made changes in Footer Section.",
                "type": NotificationType.UPDATE,
                "read": False,
                "createdAt": datetime.utcnow(),
            })
            return {"success": True, "message": "Footer updated successfully"}
        await Database.create_notification({
            "message": f"ERROR Footer: Admin {current_admin['username']} failed to update footer.",
            "type": NotificationType.ERROR,
            "read": False,
            "createdAt": datetime.utcnow(),
        })
        raise HTTPException(status_code=500, detail="Failed to update footer")
    except Exception as e:
        logger.error(f"Error updating footer: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@api_router.get("/admin/notifications")
async def get_all_notifications(current_admin: dict = Depends(get_current_admin)):
    notifications = await Database.get_notifications()
    unread_count = await notifications_collection.count_documents({"read": False})
    return {"success": True, "data": notifications, "unread_count": unread_count}


@api_router.put("/admin/notifications/{notification_id}/read")
async def mark_one_as_read(notification_id: str, current_admin: dict = Depends(get_current_admin)):
    """Marks a single notification as read."""
    success = await Database.mark_notification_as_read(notification_id)
    if not success:
        raise HTTPException(
            status_code=404, detail="Notification not found or already read")
    return {"success": True, "message": "Notification marked as read"}


@api_router.post("/admin/notifications/mark-read")
async def mark_as_read(current_admin: dict = Depends(get_current_admin)):
    success = await Database.mark_notifications_as_read()
    if not success:
        raise HTTPException(
            status_code=500, detail="Failed to mark notifications as read")
    await Database.create_notification({
        "message": f"SUCCESS UPDATE Notifications: Admin {current_admin['username']} marked all notifications as read.",
        "type": NotificationType.INFO,
        "read": True,
        "createdAt": datetime.utcnow(),
    })
    return {"success": True, "message": "Notifications marked as read"}


@api_router.delete("/admin/notifications")
async def clear_all_notifications(current_admin: dict = Depends(get_current_admin)):
    """Deletes all notifications."""
    success = await Database.delete_all_notifications()
    if not success:
        raise HTTPException(
            status_code=500, detail="Failed to clear notifications")
    await Database.create_notification({
        "message": f"SUCCESS DELETE Notifications: Admin {current_admin['username']} cleared all notifications.",
        "type": NotificationType.INFO,
        "read": False,
        "createdAt": datetime.utcnow(),
    })
    return {"success": True, "message": "All notifications cleared"}


@api_router.post("/admin/logout-notify")
async def notify_logout(current_admin: dict = Depends(get_current_admin)):
    """Creates a notification when a user logs out."""
    await Database.create_notification({
        "message": f"Admin '{current_admin.get('username')}' logged out.",
        "type": NotificationType.SECURITY,
        "read": False,
        "createdAt": datetime.utcnow()
    })
    return {"success": True, "message": "Logout notification created."}

# Include the router in the main app
app.include_router(api_router)

# CORS middleware
origins = [
    "http://localhost:3000",
    # "https://your-deployed-portfolio-url.com" # You can add your live site URL here later
]

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=origins,  # <-- Use the specific list instead of ["*"]
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handler


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"success": False, "message": "Internal server error"}
    )
