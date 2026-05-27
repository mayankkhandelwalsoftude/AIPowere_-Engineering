import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Return template structure as JSON - client will build Excel file
  const template = {
    plan_sheet: {
      headers: ['Field', 'Value', 'Notes'],
      rows: [
        ['Plan Title *', '', 'e.g. Master RAG and AI Agents in 90 days'],
        ['Plan Type *', 'GenAI', 'Options: GenAI / AI Engineering / MLOps / Data Engineering / AI Agents / LLMOps / RAG / MCP / Cloud AI / AI Security / Custom'],
        ['Technology Area', '', 'e.g. LangChain, OpenAI, Azure, Pinecone'],
        ['Objective *', '', 'What will you be able to DO after completing this plan?'],
        ['Learning Objectives', '', 'List your specific learning goals (one per line or separated by semicolons)'],
        ['Skills Tags', '', 'e.g. RAG, LangChain, Vector DB, Azure OpenAI, Prompt Engineering'],
        ['Start Date *', '', 'Format: YYYY-MM-DD e.g. 2025-06-01'],
        ['End Date *', '', 'Format: YYYY-MM-DD e.g. 2025-08-31'],
        ['Priority *', 'Medium', 'Options: Low / Medium / High'],
        ['GitHub Repo', '', 'https://github.com/yourname/repo (optional)'],
        ['Business Use Case', '', 'Which client project or delivery does this support? (optional)'],
      ]
    },
    milestones_sheet: {
      headers: ['Milestone No *', 'Title *', 'Goal', 'Start Date *', 'End Date *', 'Skills Covered', 'Expected Evidence'],
      sample_rows: [
        ['1', 'Week 1: RAG Fundamentals', 'Understand RAG architecture and build first pipeline', '2025-06-01', '2025-06-07', 'RAG, FAISS, LangChain', 'GitHub commit with working RAG demo'],
        ['2', 'Week 2: Vector Databases', 'Learn and implement Pinecone and Weaviate', '2025-06-08', '2025-06-14', 'Pinecone, Weaviate, Embeddings', 'Working vector search with 1000+ documents'],
        ['3', 'Week 3: Production RAG', 'Deploy RAG pipeline to Azure', '2025-06-15', '2025-06-21', 'Azure, Docker, FastAPI', 'Live deployment URL with demo video'],
      ]
    },
    tasks_sheet: {
      headers: ['Milestone No *', 'Task Title *', 'Task Type *', 'Due Date', 'Estimated Hours', 'Expected Output', 'Description'],
      task_types: 'Learning / Coding / POC / Documentation / Demo / Assessment / Certification / Project',
      sample_rows: [
        ['1', 'Study RAG architecture concepts', 'Learning', '2025-06-02', '3', 'Notes document with RAG architecture diagram', 'Read and summarize RAG paper, watch 2 YouTube tutorials on RAG implementation'],
        ['1', 'Build basic document Q&A with FAISS', 'Coding', '2025-06-05', '6', 'GitHub: github.com/yourname/rag-demo - working Q&A on PDF', 'Build a Python script that loads a PDF, creates FAISS index, and answers questions using OpenAI'],
        ['1', 'Create RAG architecture diagram', 'Documentation', '2025-06-07', '2', 'Architecture diagram PDF in GitHub repo', 'Draw and explain the RAG pipeline from document ingestion to answer generation'],
        ['2', 'Set up Pinecone free tier', 'Coding', '2025-06-09', '2', 'Working Pinecone index with sample data loaded', 'Create Pinecone account, set up index, upload 500 sample documents and verify search'],
        ['2', 'Compare FAISS vs Pinecone performance', 'POC', '2025-06-12', '4', 'Comparison report with benchmarks', 'Run the same 100 queries on both FAISS and Pinecone, compare latency and accuracy'],
        ['3', 'Dockerize RAG application', 'Coding', '2025-06-16', '4', 'Docker image on Docker Hub', 'Create Dockerfile and docker-compose for the RAG application'],
        ['3', 'Deploy to Azure Container Apps', 'Demo', '2025-06-19', '5', 'Live URL: https://rag-demo.azurecontainerapps.io', 'Deploy dockerized RAG app to Azure Container Apps with proper environment variables'],
      ]
    }
  }

  return NextResponse.json(template)
}
