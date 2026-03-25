import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">
              Seite nicht gefunden
            </h1>
          </div>

          <p className="mt-4 text-sm text-gray-600">
            Die angeforderte Seite existiert nicht oder wurde verschoben.
          </p>

          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate("/")}
          >
            Zurück zum Hub
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
