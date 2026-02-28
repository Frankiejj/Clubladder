import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, Lock, ShieldCheck, Mail, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const Terms = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-8">
          <Button className="mb-3" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold text-green-800 flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Terms & Privacy Policy
          </h1>
          <p className="text-sm text-green-600">Terms and privacy information for Sportsladder</p>
        </div>

        <Card className="shadow-sm border-green-200 mb-4">
          <CardHeader className="bg-gradient-to-r from-green-50/80 to-emerald-50/80 rounded-t-lg py-3">
            <CardTitle className="text-green-800 text-base sm:text-lg flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Personal data stored at registration
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5 space-y-3 text-sm text-gray-700">
            <p>Sportsladder stores the following personal data when you register:</p>
            <ul className="list-disc ml-5 space-y-1">
              <li>First name</li>
              <li>Last name</li>
              <li>Email address</li>
              <li>Phone number</li>
              <li>Selected sport</li>
              <li>Selected club</li>
              <li>Optional profile avatar</li>
              <li>Authentication and verification data needed to log in securely</li>
              <li>Ladder participation, rankings, match results, and scheduling data</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-green-200 mb-4">
          <CardHeader className="bg-gradient-to-r from-green-50/80 to-emerald-50/80 rounded-t-lg py-3">
            <CardTitle className="text-green-800 text-base sm:text-lg flex items-center gap-2">
              <Eye className="h-4 w-4" />
              How data is used
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5 space-y-3 text-sm text-gray-700">
            <p>
              Personal data is used only for account creation, login, club membership, match scheduling,
              rankings, and communication inside the app.
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-green-200 mb-4">
          <CardHeader className="bg-gradient-to-r from-green-50/80 to-emerald-50/80 rounded-t-lg py-3">
            <CardTitle className="text-green-800 text-base sm:text-lg flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              GDPR
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5 space-y-3 text-sm text-gray-700">
            <p>Sportsladder complies with GDPR.</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-green-200">
          <CardHeader className="bg-gradient-to-r from-green-50/80 to-emerald-50/80 rounded-t-lg py-3">
            <CardTitle className="text-green-800 text-base sm:text-lg flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Questions
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5 space-y-3 text-sm text-gray-700">
            <p>
              If you have any questions, please contact{" "}
              <a className="text-green-700 hover:underline font-medium" href="mailto:support@sportsladder.nl">
                support@sportsladder.nl
              </a>
              .
            </p>
            <p>
              You can also return to{" "}
              <Link to="/login" className="text-green-700 hover:underline font-medium">
                login
              </Link>{" "}
              or continue in the app.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Terms;
