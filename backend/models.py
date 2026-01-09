from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime, timezone
import uuid
from enum import Enum

class ProfileBase(BaseModel):
    name: str
    headline: str
    bio: str
    role: str
    highlights: str
    profileImage: str
    email: EmailStr
    linkedin: str
    instagram: str
    github: str
    telegram: str
    location: str = "Nainital, Uttarakhand, India"
    resume_url: Optional[str] 
    hero_title: str = "STATUS: ONLINE"
    hero_lines: List[str]
    skills_primary: List[str] = []
    chipCount: int = 8


class Profile(ProfileBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    updatedAt: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc))


class Skill(BaseModel):
    name: str
    proficiency: int = Field(..., ge=0, le=100)


class SkillsBase(BaseModel):
    category: str
    skills: List[Skill]


class Skills(SkillsBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    updatedAt: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc))


class ProjectBase(BaseModel):
    title: str
    description: str
    status: str  # e.g. 'completed', 'coming-soon'
    image: str
    liveUrl: Optional[str] = None
    githubUrl: Optional[str] = None
    technologies: List[str] = []
    year: Optional[int] = None
    


class Project(ProjectBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    createdAt: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc))
    updatedAt: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc))
   

class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    image: Optional[str] = None
    liveUrl: Optional[str] = None
    githubUrl: Optional[str] = None
    technologies: Optional[List[str]] = None
    year: Optional[int] = None
    
class ProjectsPage(BaseModel):
    id: str = Field(default="projects_page_main", alias="_id")
    header: Optional[str]
    subtitle: Optional[str]
    tip: Optional[str]
    
class ProjectsPageUpdate(BaseModel):
    header: Optional[str]
    subtitle: Optional[str]
    tip: Optional[str]

class EducationBase(BaseModel):
    degree: str
    program: str
    institution: str
    university: str
    location: str
    start: Optional[str] = None
    end: Optional[str] = None
    year: str
    gpa: Optional[str] = None
    progress: int = 75  # percentage
    achievements: List[str] = []
    coursework: List[str] = []
    link: Optional[str] = None
    logo: Optional[str] = None
    verified: bool = False
    type: Optional[str] = None
    


class Education(EducationBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    updatedAt: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc))
    
class EducationCreate(EducationBase):
    pass

class EducationUpdate(BaseModel):
    degree: Optional[str] = None
    program: Optional[str] = None
    institution: Optional[str] = None
    university: Optional[str] = None
    location: Optional[str] = None
    start: Optional[str] = None
    end: Optional[str] = None
    year: Optional[str] = None
    gpa: Optional[str] = None
    progress: Optional[int] = None
    achievements: Optional[List[str]] = None
    coursework: Optional[List[str]] = None
    link: Optional[str] = None
    logo: Optional[str] = None
    verified: Optional[bool] = None
    type: Optional[str] = None


class Goal(BaseModel):
    title: str
    description: str


class ExperienceBase(BaseModel):
    role: str
    company: str
    location: str
    start: Optional[str] = None
    end: Optional[str] = None
    bullets: List[str] = None
    technologies: List[str] = []
    type: Optional[str] = None  # e.g. 'work', 'internship', 'volunteering'
    logo: Optional[str] = None
    t: Optional[float] = None  # position on the track for 3D timeline
    description: Optional[str] = None  # Added description field

class Experience(ExperienceBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    updatedAt: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc))
    
class ExperienceCreate(ExperienceBase):
    pass

class ExperienceUpdate(BaseModel):
    role: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    start: Optional[str] = None
    end: Optional[str] = None
    bullets: Optional[List[str]] = None
    technologies: Optional[List[str]] = None
    type: Optional[str] = None
    logo: Optional[str] = None
    t: Optional[float] = None
    description: Optional[str] = None  # Added description field


class LearningJourneyBase(BaseModel):
    phase: str
    skills: List[str]
    status: str  # e.g. 'completed', 'in-progress', 'planned'
    order: int


class LearningJourney(LearningJourneyBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    updatedAt: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc))


class LearningJourneyCreate(LearningJourneyBase):
    pass


class LearningJourneyUpdate(BaseModel):
    phase: Optional[str] = None
    skills: Optional[List[str]] = None
    status: Optional[str] = None
    order: Optional[int] = None


class GrowthMindsetBase(BaseModel):
    title: str
    quote: str


class GrowthMindset(GrowthMindsetBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    updatedAt: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc))


class ExperimentItem(BaseModel):
    title: str
    description: str
    status: str


class InnovationLabFeature(BaseModel):
    title: str
    description: str


class ExperimentsSectionData(BaseModel):
    header_title: str
    header_description: str
    lab_title: str
    lab_description: str
    lab_features: List[InnovationLabFeature]
    experiments: List[ExperimentItem]


class ExperimentsSectionDB(ExperimentsSectionData):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    updatedAt: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc))


class ContactLink(BaseModel):
    name: str  # e.g. "Email", "LinkedIn"
    value: str  # e.g. "test@test.com", "linkedin.com/in/..."
    icon: str  # e.g. "Mail", "Linkedin"
    color: str


class ContactSectionData(BaseModel):
    header_title: str
    header_description: str
    connect_title: str
    connect_description: str
    get_in_touch_title: str
    get_in_touch_description: str
    contact_links: List[ContactLink]


class ContactSectionDB(ContactSectionData):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    updatedAt: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc))


class ContactMessageBase(BaseModel):
    name: str
    email: EmailStr
    message: str


class ContactMessage(ContactMessageBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    read: bool = False
    createdAt: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc))


class ContactMessageCreate(ContactMessageBase):
    pass


class FooterLink(BaseModel):
    name: str
    href: str


class FooterData(BaseModel):
    brand_name: str
    brand_description: str
    quick_links: List[FooterLink]
    connect_title: str
    connect_description: str
    bottom_text: str


class FooterDB(FooterData):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    updatedAt: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc))


class NotificationType(str, Enum):
    INFO = "info"
    SUCCESS = "success"
    WARNING = "warning"
    ERROR = "error"
    MESSAGE = "message"
    USER = "user"
    UPDATE = "update"
    SECURITY = "security"
    CREATE = "create"
    DELETE = "delete"


class NotificationBase(BaseModel):
    message: str
    read: bool = False
    type: NotificationType = NotificationType.INFO


class Notification(NotificationBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    createdAt: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc))


class AdminBase(BaseModel):
    username: str
    name: Optional[str] = None
    profileImage: Optional[str] = None


class Admin(AdminBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    createdAt: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc))


class AdminCreate(BaseModel):
    username: str
    password: str
    name: str
    profileImage: str


class AdminLogin(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None


class APIResponse(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None


class ListResponse(BaseModel):
    success: bool
    message: str
    data: List[dict]
    total: int


class AdminProfileResponse(BaseModel):
    username: str
    name: str
    profileImage: str
    role: str
