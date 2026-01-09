import React, { Suspense, lazy, useEffect } from "react";
import "./App.css";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { Toaster } from "./components/ui/toaster";

// Components for the main portfolio page
const AboutSection = lazy(() =>
  import(/*webpackPrefetch: true*/ "./components/AboutSection")
);
const ProjectsSection = lazy(() =>
  import(/*webpackPrefetch: true*/ "./components/ProjectsSection")
);
const EducationSection = lazy(() =>
  import(/*webpackPrefetch: true*/ "./components/EducationSection")
);
const LearningJourneySection = lazy(() =>
  import(/*webpackPrefetch: true*/ "./components/LearningJourneySection")
);
const ExperimentsSection = lazy(() =>
  import(/*webpackPrefetch: true*/ "./components/ExperimentsSection")
);
const ContactSection = lazy(() =>
  import(/*webpackPrefetch: true*/ "./components/ContactSection")
);
const Footer = lazy(() =>
  import(/*webpackPrefetch: true*/ "./components/Footer")
);
const Test = lazy(() => import(/*webpackPrefetch: true*/ "./components/Test"));
import Home from "./pages/Home";
import PortfolioLayout from "./pages/Portfolio";

// --- Components for the Admin Panel ---
import Login from "./components/Admin/Login";
import AdminLayout from "./components/Admin/AdminLayout";
import AdminDashboard from "./components/Admin/AdminDashboard";
import ProtectedRoute from "./components/Admin/ProtectedRoute";
import ProjectsManager from "./components/Admin/ProjectsManager";
import ProfileManager from "./components/Admin/ProfileManager";
import SkillsManager from "./components/Admin/SkillsManager";
import EducationManager from "./components/Admin/EducationManager";
import ExperienceManager from "./components/Admin/ExperienceManager";
import LearningJourneyManager from "./components/Admin/LearningJourneyManager";
import ExperimentsManager from "./components/Admin/ExperimentsManager";
import MessagesManager from "./components/Admin/MessagesManager";
import ContactManager from "./components/Admin/ContactManager";
import FooterManager from "./components/Admin/FooterManager";
import AdminManager from "./components/Admin/AdminManager";
import SearchResults from "./components/Admin/SearchResults";
import MessagePopover from "./components/Admin/MessageDropDown";
import { AdminProvider } from "./context/AdminContext";

// (prefetch below keeps first navigation snappy)

function LoadingScreen() {
  return <div className="h-screen w-full bg-[#030907]" />;
}

function ExperienceRouteProxy() {
  return null;
}

// This is the main App component that handles all routing.
function App() {
  //const { pathname } = useLocation();
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          {/* Main Portfolio Route */}
          <Route element={<Home />}>
            <Route path="/" element={<Navigate to="/portfolio" replace />} />
            

            <Route path="/portfolio" element={<PortfolioLayout />}>
              {/* The default page shown at "/portfolio" will be the hero section */}
              <Route
                index
                element={<ExperienceRouteProxy />}
              />
              <Route
                path="about"
                element={
                  <Suspense fallback={<LoadingScreen />}>
                    <AboutSection />
                  </Suspense>
                }
              />
              <Route
                path="projects"
                element={
                  <Suspense fallback={<LoadingScreen />}>
                    <ProjectsSection />
                  </Suspense>
                }
              />
              <Route path="skills" element={<ExperienceRouteProxy />} />
              <Route
                path="education"
                element={
                  <Suspense fallback={<LoadingScreen />}>
                    <EducationSection />
                  </Suspense>
                }
              />
              <Route path="experience" element={<ExperienceRouteProxy />} />
              <Route
                path="learning-journey"
                element={
                  <Suspense fallback={<LoadingScreen />}>
                    <LearningJourneySection />
                  </Suspense>
                }
              />
              <Route
                path="experiments"
                element={
                  <Suspense fallback={<LoadingScreen />}>
                    <ExperimentsSection />
                  </Suspense>
                }
              />
              <Route
                path="contact"
                element={
                  <Suspense fallback={<LoadingScreen />}>
                    <ContactSection />
                  </Suspense>
                }
              />
              <Route
                path="footer"
                element={
                  <Suspense fallback={<LoadingScreen />}>
                    <Footer />
                  </Suspense>
                }
              />
              <Route
                path="test"
                element={
                  <Suspense fallback={<LoadingScreen />}>
                    <Test />
                  </Suspense>
                }
              />

              {/* We will add more routes for Skills, Contact, etc. later */}
            </Route>
          </Route>

          {/* Admin Login Route (Public) */}
          <Route path="/admin/login" element={<Login />} />

          {/* --- THIS IS THE CRITICAL FIX --- */}
          {/* The AdminProvider now wraps the entire protected admin section */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminProvider>
                  <AdminLayout />
                </AdminProvider>
              </ProtectedRoute>
            }
          >
            {/* These pages are now correctly nested and will have access to the context */}
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="profile" element={<ProfileManager />} />
            <Route path="skills" element={<SkillsManager />} />
            <Route path="projects" element={<ProjectsManager />} />
            <Route path="education" element={<EducationManager />} />
            <Route path="experience" element={<ExperienceManager />} />
            <Route
              path="learning-journey"
              element={<LearningJourneyManager />}
            />
            <Route path="experiments" element={<ExperimentsManager />} />
            <Route path="messages" element={<MessagesManager />} />
            <Route path="contact" element={<ContactManager />} />
            <Route path="footer" element={<FooterManager />} />
            <Route path="manage-admins" element={<AdminManager />} />
            <Route path="search" element={<SearchResults />} />
          </Route>
          {/* --- END OF FIX --- */}
        </Routes>
      </BrowserRouter>
      <Toaster />
    </div>
  );
}

export default App;
