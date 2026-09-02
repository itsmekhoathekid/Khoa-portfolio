export type WorkKind = 'projects' | 'publications' | 'competitions';

export type DemoWork = {
  id: string;
  kind: WorkKind;
  title: string;
  summary: string;
  bodyMarkdown: string;
  tags: string[];
  githubUrl: string;
  tone: 'teal' | 'blue' | 'warm';
};

export const works: DemoWork[] = [
  {
    id: 'recsys-mlops-agentic-platform',
    kind: 'projects',
    title: 'End-to-End Recommendation MLOps & Agentic Platform',
    summary:
      'Production-grade recommendation platform spanning streaming features, distributed training, model serving, agent orchestration, infrastructure, and observability.',
    bodyMarkdown: `- Ingests PostgreSQL WAL through Debezium/Kafka and processes data with Spark/Flink into an Iceberg/MinIO lakehouse.\n- Uses Feast, PostgreSQL, and Redis for offline and online features.\n- Automates BST training with PyTorch, Kubeflow Pipelines, Ray Tune/RayJobs, and MLflow.\n- Serves recommendations through FastAPI, KServe, and Triton with deterministic A/B bucketing and progressive rollout.\n- Coordinates sandboxed RAG and recommendation agents through kagent/Substrate, A2A, and typed MCP tools.\n- Runs on GCP/GKE using Terraform, Helm, Istio, KEDA, gVisor, Vault, Prometheus, Grafana, Loki, Tempo, and OpenTelemetry.`,
    tags: ['recsys', 'mlops', 'agents', 'kubernetes'],
    githubUrl: 'https://github.com/itsmekhoathekid/RecSys-MLops',
    tone: 'teal',
  },
  {
    id: 'medical-image-classification',
    kind: 'projects',
    title: 'Medical Image Classification',
    summary:
      'Compared handcrafted and deep features for lung CT classification; reimplemented MIAFEX and achieved 91.17% F1-macro with SVM.',
    bodyMarkdown:
      'Applied geometric augmentation to lung CT images and compared HOG, LBP, and Gabor features with VGG16 and ResNet50 features across multiple classifiers.',
    tags: ['computer-vision', 'medical-ai', 'svm'],
    githubUrl: 'https://github.com/CaoTienTrung/Medical-Image-Classification',
    tone: 'blue',
  },
  {
    id: 'zero-shot-object-counting',
    kind: 'projects',
    title: 'Zero-shot Text-Guided Object Counting with Exemplar',
    summary:
      'Literature-driven text-guided object counting model with foreground-aware loss and exemplar extraction, achieving 38.81 MAE on FSC-147-S.',
    bodyMarkdown:
      'Built a zero-shot object counting system combining text guidance, foreground-aware loss, and exemplar extraction.',
    tags: ['computer-vision', 'zero-shot', 'multimodal'],
    githubUrl: 'https://github.com/itsmekhoathekid/CountingObject',
    tone: 'warm',
  },
  {
    id: 'lstm-attacks-defenses',
    kind: 'projects',
    title: 'Attacks and Defenses in LSTM',
    summary:
      'Studied FGSM, backdoor, and label-flipping attacks on LSTM fraud detection, then implemented defenses restoring average accuracy to 89%.',
    bodyMarkdown:
      'The evaluated attacks reached an average 89.08% attack success rate. Corresponding defenses restored model accuracy to an average of 89%.',
    tags: ['deep-learning', 'security', 'lstm'],
    githubUrl: 'https://github.com/itsmekhoathekid/Fraud-Detection',
    tone: 'teal',
  },
  {
    id: 'vispeechformer',
    kind: 'publications',
    title: 'ViSpeechFormer: A Phonemic Approach for Vietnamese ASR',
    summary:
      'Graduation thesis using Vietnamese phonology and multi-token prediction to reduce model size while improving WER and OOV recovery.',
    bodyMarkdown:
      'Implemented reproducible ASR baselines and a transformer decoder that reduced parameters by 23%, improved LSVSC WER by 0.31% absolute, and recovered 27.27% of OOV cases while maintaining standard Transformer-like latency.',
    tags: ['asr', 'transformers', 'vietnamese-nlp'],
    githubUrl: 'https://github.com/itsmekhoathekid/PhonoASR',
    tone: 'blue',
  },
  {
    id: 'imcom2026-harmful-video',
    kind: 'publications',
    title: 'IMCOM2026 — Real-Time Multi-Modal Harmful Video Detection',
    summary:
      'Vietnamese harmful-content classification using audio, text, and vision, with an end-to-end Kafka–Spark feature pipeline.',
    bodyMarkdown:
      'The multimodal classifier achieved an average F1 score of 88.84%. Video ingestion and large-scale feature extraction run through Kafka and Spark, with Cassandra-backed reproducible training data.',
    tags: ['multimodal', 'video', 'kafka', 'spark'],
    githubUrl: 'https://github.com/itsmekhoathekid/HarmfulVideoDetectionSystem',
    tone: 'warm',
  },
  {
    id: 'sage-dsc2024',
    kind: 'competitions',
    title: 'SAGE — Smart App for Graduation Exam Prep',
    summary:
      'Led a smart education web app team at Data Science Challenge 2024; received an Honorable Mention and ranked 6th overall.',
    bodyMarkdown:
      'Built performance analytics, personalized learning paths, and an AI chatbot using Flask/FastAPI, deployed on Google Cloud Platform.',
    tags: ['education', 'chatbot', 'gcp'],
    githubUrl: 'https://github.com/itsmekhoathekid/DSC2024',
    tone: 'teal',
  },
  {
    id: 'video-retrieval-aic2025',
    kind: 'competitions',
    title: 'Video Retrieval System — AI Challenge HCM 2025',
    summary:
      'Multimodal retrieval over 100 GB of video frames using SigLIP, InternVL, Milvus, and two-stage cosine re-ranking.',
    bodyMarkdown:
      'Extracted image features with SigLIP and text embeddings with InternVL, stored vectors in Milvus, and applied a two-stage retrieval strategy to improve search accuracy.',
    tags: ['retrieval', 'multimodal', 'milvus'],
    githubUrl: 'https://github.com/itsmekhoathekid/AIC2025',
    tone: 'blue',
  },
];

export const experiences = [
  {
    id: 'vulcan-labs-ai-engineer',
    period: 'Mar 2026—Jun 2026',
    title: 'AI Engineer Intern · Vulcan Labs',
    organization: 'Vulcan Labs',
    summary:
      'Built internal AI agent tools for PR review, QC bug triage, and marketing analytics by integrating Slack, Jira, GitHub, and internal APIs.',
    bodyMarkdown:
      'Developed an internal marketing analytics dashboard with AI-assisted chart generation and reporting using React, Vite, Tailwind CSS, Recharts/ECharts, FastAPI, and a LangGraph-based agent orchestrator calling MCP tools.',
    tone: 'teal' as const,
  },
  {
    id: 'uit-data-science',
    period: '2022—2026',
    title: 'B.Sc. Data Science · UIT, VNU-HCM',
    organization: 'University of Information Technology — VNU-HCM',
    summary: 'Graduated with a Bachelor of Data Science and a GPA of 3.6.',
    bodyMarkdown:
      'University of Information Technology (UIT), Vietnam National University Ho Chi Minh City.',
    tone: 'blue' as const,
  },
];

export type DemoBlog = {
  id: string;
  slug: string;
  date: string;
  title: string;
  summary: string;
  bodyMarkdown: string;
  tags: string[];
};
export const blogPosts: DemoBlog[] = [
  {
    id: 'agent-evals',
    slug: 'agent-evals',
    date: '2026-09-02',
    title: 'Practical Agent Evals for Production Systems',
    summary:
      'A compact workflow for evaluating tool-using agents before production rollout.',
    bodyMarkdown: `## Start with observable behavior

An agent evaluation should score the complete trajectory, not only the final answer. Capture the selected tool, validated arguments, returned evidence, latency, and recovery behavior.

### A minimal evaluator

\`\`\`python
def evaluate(run, expected):
    return {
        "correct": run.answer == expected.answer,
        "tool_path": run.tools == expected.tools,
        "grounded": all(claim.source for claim in run.claims),
    }
\`\`\`

Use deterministic fixtures for regression tests, then add adversarial and production-shaped cases. A release should fail closed when permissions, schemas, or required evidence are missing.

| layer | signal |
| --- | --- |
| task | answer correctness |
| trajectory | tool choice and arguments |
| system | latency, cost, and recovery |
| safety | authorization and data boundaries |
`,
    tags: ['agents', 'evals', 'mlops'],
  },
];
