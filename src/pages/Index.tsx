
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to home without requiring login
    navigate("/home");
  }, [navigate]);

  return null; // This component doesn't render anything, it just redirects
};

export default Index;
