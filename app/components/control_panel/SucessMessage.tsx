import { slackChannelLinks } from "@/app/constants/pcd";
import Image from "next/image";

interface SuccessMessageProps {
  step: string;
  submissionSuccess: string;
  environment: string;
  resetForm: () => void;
}

export default function SuccessMessage({
  step,
  submissionSuccess,
  environment,
  resetForm,
}: SuccessMessageProps) {
  const isDelete = step === "deleteRegion";
  const isUpgrade = step === "upgrade";

  const imageSrc = isUpgrade
    ? "/redirect.png"
    : isDelete
    ? "/trash.png"
    : "/tickmark.png";

  const altText = isUpgrade
    ? "Redirecting"
    : isDelete
    ? "Delete Region"
    : "Success";

  return (
    <div className="p-6 bg-green-100 border border-green-400 text-green-700 rounded flex flex-col items-center space-y-4 mt-6">
      <Image
        src={imageSrc}
        alt={altText}
        width={160}
        height={isDelete ? 240 : 160}
        className="w-40"
        priority
      />
      <p className="text-center text-lg">{submissionSuccess}</p>

      {step !== "upgrade" && (
        <a
          href={slackChannelLinks[environment] || ""}
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
