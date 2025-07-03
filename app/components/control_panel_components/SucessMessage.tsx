import Image from "next/image";
import { environmentOptions } from "@/app/constants/pcd";

interface SuccessMessageProps {
  step: string;
  submissionSuccess: string;
  environment: string;
  resetForm: () => void;
  isError: boolean;
}

export default function SuccessMessage({
  step,
  submissionSuccess,
  environment,
  resetForm,
  isError,
}: SuccessMessageProps) {
  const isDelete = step === "deleteRegion";
  const isUpgrade = step === "upgrade";

  const envMeta = environmentOptions.find((env) => env.value === environment);
  const slackUrl = envMeta?.slackChannel ?? "";

  let imageSrc = "/tickmark.png";
  let altText = "Success";

  if (isError) {
    imageSrc = "/error.png";
    altText = "Error";
  } else if (isUpgrade) {
    imageSrc = "/redirect.png";
    altText = "Redirecting";
  } else if (isDelete) {
    imageSrc = "/trash.png";
    altText = "Delete Region";
  }

  return (
    <div
      className={`p-6 ${
        isError
          ? "bg-red-100 border-red-400 text-red-700"
          : "bg-green-100 border-green-400 text-green-700"
      } border rounded flex flex-col items-center space-y-4 mt-6`}
    >
      <Image
        src={imageSrc}
        alt={altText}
        width={160}
        height={isDelete ? 240 : 160}
        className="w-40"
        priority
      />
      <p className="text-center text-lg">{submissionSuccess}</p>

      {isDelete && (
        <p className="text-gray-700 italic">
          Note: The Deletion Process takes a bit more time than other
          operations...
        </p>
      )}

      {step !== "upgrade" && step !== "updateLease" && !isError && slackUrl && (
        <a
          href={slackUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline text-blue-600 hover:text-blue-800"
        >
          Check progress in Slack Channel
        </a>
      )}

      {step !== "upgrade" && (
        <button
          onClick={resetForm}
          className="mt-4 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Back to Form
        </button>
      )}
    </div>
  );
}
