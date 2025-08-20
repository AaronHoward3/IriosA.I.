import EmailGenerator from "@/components/EmailGenerator";
import Navigation from "@/components/Navigation";
import AuthOverlay from "@/components/auth/AuthOverlay";

const Index = () => {
  return (
    <>
      <Navigation />
      <div className="pt-16">
        <AuthOverlay>
          <EmailGenerator />
        </AuthOverlay>
      </div>
    </>
  );
};

export default Index;
