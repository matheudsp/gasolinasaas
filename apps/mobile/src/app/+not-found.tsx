import { useRouter } from "expo-router";
import {Text} from "@/components/Text";
import { Button } from "@/components/Button";
// import { GenericErrorScreen } from "@/screens/error/generic-error-screen";

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    // <ErrorDetails
    //   title="Page not found"
    //   message="The page you're looking for doesn't exist or has been moved."
    //   errorDetails={{ code: 404, status: "Not Found" }}
    //   onGoHome={() => router.replace("/")}
    // />
    <>
    <Text  text="Page not found"/>
    <Button onPress={() => router.replace("/")} text="Go Home">Voltar</Button>
    </>

  );
}