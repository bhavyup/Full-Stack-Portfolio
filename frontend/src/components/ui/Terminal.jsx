import React, { useState, useEffect, useRef } from "react";
import styled, { keyframes } from "styled-components";

const scanlineAnimation = keyframes`
  0% { background-position: 0 0; }
  100% { background-position: 0 100%; }
`;

const Container = styled.section`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  font-family: "Fira Code", monospace;
  color: #00ff41;
  padding: 2rem;
  position: relative;
  overflow: hidden;

  &::after {
    content: " ";
    display: block;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(
        rgba(18, 16, 16, 0) 50%,
        rgba(0, 0, 0, 0.25) 50%
      ),
      linear-gradient(
        90deg,
        rgba(255, 0, 0, 0.06),
        rgba(0, 255, 0, 0.02),
        rgba(0, 0, 255, 0.06)
      );
    background-size: 100% 4px, 3px 100%;
    z-index: 2;
    pointer-events: none;
    animation: ${scanlineAnimation} 0.2s linear infinite;
  }
`;

const TerminalWindow = styled.div`
  width: 100%;
  max-width: 800px;
  border: 2px solid #00ff41;
  border-radius: 8px;
  background-color: rgba(0, 20, 0, 0.8);
  box-shadow: 0 0 25px rgba(0, 255, 65, 0.6);
`;

const TerminalHeader = styled.div`
  background-color: #00ff41;
  color: #0a0a0a;
  padding: 0.5rem 1rem;
  font-weight: bold;
  border-bottom: 2px solid #00ff41;
`;

const TerminalBody = styled.div`
  padding: 1.5rem;
  font-size: 1.1rem;
`;

const Terminal = ({ title = "TERMINAL", className = "", children }) => {
  return (
    <Container>
      <TerminalWindow className={className}>
        {title && <TerminalHeader>{title}</TerminalHeader>}
        <TerminalBody>{children}</TerminalBody>
      </TerminalWindow>
    </Container>
  );
};

export default Terminal;