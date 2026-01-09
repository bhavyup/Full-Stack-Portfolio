import React, { useMemo, useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Dock from "../components/ui/Components/Dock/Dock";
import { publicApi } from "@/utils/api";
import { portfolioData } from "@/mock";
import Chatbot from "../components/Chatbot";
import ExperienceKeepAlive from "@/pages/ExpKeepAlive";
import KeepAliveSkills from "@/pages/KeepALive";
import HeroKeepAlive from "@/pages/HeroKeepAlive";
import { LazyMotion, domAnimation } from "framer-motion";

import {
  TerminalSquare,
  ScanFace,
  BrainCircuit,
  FolderKanban,
  GraduationCap,
  Milestone,
  GitBranch,
  FlaskConical,
  AtSign,
} from "lucide-react";

function fetchData() {
  const [data, setData] = useState({
    loading: true,
    profile: null,
    projects: [],
    skills: {},
    experience: [],
    error: null,
  });
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [p, pr, sk, xp] = await Promise.all([
          publicApi.getProfile?.(),
          publicApi.getProjects?.(),
          publicApi.getSkills?.(),
          publicApi.getExperience?.(),
        ]);
        if (!alive) return;
        setData({
          loading: false,
          profile: p?.success ? p.data : portfolioData?.profile ?? null,
          projects: pr?.success ? pr.data : portfolioData?.projects ?? [],
          skills: sk?.success ? sk.data : portfolioData?.skills ?? {},
          experience: xp?.success ? xp.data : portfolioData?.experience ?? [],
          error: null,
        });
      } catch (err) {
        if (!alive) return;
        setData({
          loading: false,
          profile: portfolioData?.profile ?? null,
          projects: portfolioData?.projects ?? [],
          skills: portfolioData?.skills ?? {},
          experience: portfolioData?.experience ?? [],
          error: err?.message || "Failed to fetch data",
        });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);
  return data;
}

const Portfolio = () => {
  const items = useMemo(
    () => [
      { icon: <TerminalSquare />, label: "Home", href: "/portfolio" },
      { icon: <ScanFace />, label: "Profile", href: "/portfolio/about" },
      { icon: <BrainCircuit />, label: "Skills", href: "/portfolio/skills" },
      {
        icon: <FolderKanban />,
        label: "Projects",
        href: "/portfolio/projects",
      },
      {
        icon: <GraduationCap />,
        label: "Education",
        href: "/portfolio/education",
      },
      {
        icon: <Milestone />,
        label: "Experience",
        href: "/portfolio/experience",
      },
      {
        icon: <GitBranch />,
        label: "Learning Journey",
        href: "/portfolio/learning-journey",
      },
      {
        icon: <FlaskConical />,
        label: "Experiments",
        href: "/portfolio/experiments",
      },
      { icon: <AtSign />, label: "Contact", href: "/portfolio/contact" },
      { icon: <TerminalSquare />, label: "Test", href: "/portfolio/test" },
    ],
    []
  );

  const { pathname } = useLocation();
  const showExperience = pathname.startsWith("/portfolio/experience");
  const showHero = pathname === "/portfolio";
  const showAbout = pathname.startsWith("/portfolio/about");
  const showProjects = pathname.startsWith("/portfolio/projects");
  const showSkills = pathname.startsWith("/portfolio/skills");
  const showEducation = pathname.startsWith("/portfolio/education");
  const showLearningJourney = pathname.startsWith(
    "/portfolio/learning-journey"
  );
  const showExperiments = pathname.startsWith("/portfolio/experiments");
  const showContact = pathname.startsWith("/portfolio/contact");
  const showTest = pathname.startsWith("/portfolio/test");

  const { loading, profile, projects, skills, experience, error } = fetchData();

  return (
    <LazyMotion features={domAnimation}>
      <div className="min-h-screen bg-[#030b13] text-white relative overflow-x-hidden">
        <div id="contOutlet" className="relative z-10">
          <HeroKeepAlive show={showHero} profile={profile} skills={skills} projects={projects} />
          <KeepAliveSkills show={showSkills} data={skills} />
          <ExperienceKeepAlive show={showExperience} data={experience} />
          <Outlet />
        </div>

        <Dock
          items={items}
          magnification={90}
          distance={100}
          spring={{ stiffness: 300, damping: 20 }}
          baseItemSize={48}
          panelWidth={70}
        />

        <Chatbot />
      </div>
    </LazyMotion>
  );
};

export default React.memo(Portfolio);
