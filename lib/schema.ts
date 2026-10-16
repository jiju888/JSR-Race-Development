import { z } from "zod";
export const segmentSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    start: z.number().finite().min(0),
    end: z.number().finite().positive(),
  })
  .refine(
    (s) => s.end > s.start && s.end - s.start <= 30,
    "Select a segment between 0 and 30 seconds long.",
  );
export const reportSchema = z.object({
  summary: z.string(),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  corners: z.array(
    z.object({
      name: z.string(),
      observation: z.string(),
      evidence: z.string(),
      explanation: z.string(),
      suggestion: z.string(),
      confidence: z.enum(["low", "medium", "high"]),
    }),
  ),
  nextSessionPlan: z.array(z.string()).length(3),
  limitations: z.array(z.string()),
});
export type Report = z.infer<typeof reportSchema>;
export type Segment = z.infer<typeof segmentSchema>;
export type Session = {
  id: string;
  createdAt: string;
  simulator: string;
  track: string;
  vehicle: string;
  lapTime: string;
  comments: string;
  duration: number;
  bytes: number;
  report?: Report;
  segment?: Segment;
  frames?: { name: string; time: number }[];
};
