export type MessageType = "Feeback" | "Support" | "Spam" | "Other";
export type SupportType = "Bug" | "Technical question";

export type Message = {
  sender: string;
  message: string;
};

export type Feedback = {
  userId?: string;
  text: string;
  isPositive: boolean;
};

export type Support = {
  userId: string;
  supportType: SupportType;
  bug?: {
    description: string;
    severity: string;
  };
  technicalQuestion: {
    question: string;
    awnser: string;
    links: string[];
    awnserFound: boolean;
  };
};
