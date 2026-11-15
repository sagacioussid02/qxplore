import { Link, useParams } from 'react-router-dom';

// Quantum Computing — a beginner-friendly track of short, animated lessons.
// Mirrors the ML Foundations track: each lesson's animation is a self-contained
// HTML file shipped as a static asset under
// public/lessons/quantum-computing/animations/ and embedded below in an iframe,
// so new lessons can be added without touching app code: drop the HTML file in
// that folder and add one entry to LESSONS. Each lesson names its Microsoft
// source (Learn module or Quantum Kata) and ends with one
// check-your-understanding question.
const LESSONS = [
  {
    slug: 'what-quantum-computing-is',
    title: 'What Quantum Computing Is (and Isn’t)',
    intro:
      'A classical computer stores information in bits — each one is a 0 or a 1, and it works through possibilities one at a time. A quantum computer stores information in qubits, which can hold a mix of 0 and 1 at the same time, and qubits can be linked so their states depend on each other. That lets a quantum computer explore many possibilities in a structured way at once — but only for certain kinds of problems. It is a specialist tool, not a faster laptop: it will not load web pages quicker or make your spreadsheets snappier.',
    animation: '/lessons/quantum-computing/animations/what-quantum-computing-is.html',
    source: {
      title: 'Introduction to quantum computing with Azure Quantum',
      url: 'https://learn.microsoft.com/en-us/training/modules/intro-to-azure-quantum/',
    },
    check: {
      question:
        'A friend says a quantum computer is just a super-fast laptop that will make every program run faster. What is wrong with that?',
      answer:
        'A quantum computer only speeds up specific kinds of problems — searching unsorted data, factoring large numbers, simulating molecules. For everyday tasks like loading a web page, a classical computer is faster, cheaper, and better. Quantum computers are specialists that work alongside classical computers, not replacements for them.',
    },
  },
];

export default function QuantumComputingPage() {
  const { slug } = useParams();
  const index = LESSONS.findIndex((lesson) => lesson.slug === slug);

  // Index view: /learn/quantum-computing
  if (!slug) {
    return (
      <div className="space-y-8 max-w-4xl">
        <div>
          <h1 className="text-4xl font-mono font-bold text-quantum-cyan">Quantum Computing</h1>
          <p className="mt-3 text-gray-300 max-w-2xl">
            Quantum computing, one small idea at a time. Each lesson is a short read plus an
            interactive animation you can poke at — no physics degree, no jargon without a
            definition. Start at the top; each lesson builds on the ones before it. Lessons
            follow Microsoft Learn and the Microsoft Quantum Katas, linked from each lesson.
          </p>
        </div>
        <div className="grid gap-4">
          {LESSONS.map((lesson, i) => (
            <Link
              key={lesson.slug}
              to={`/learn/quantum-computing/${lesson.slug}`}
              className="card-quantum p-5 block no-underline hover:border-quantum-cyan transition-all"
            >
              <div className="text-xs font-mono text-gray-500">Lesson {i + 1}</div>
              <div className="text-xl font-semibold text-white mt-1">{lesson.title}</div>
              <p className="text-sm text-gray-400 mt-2 line-clamp-2">{lesson.intro}</p>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  // Unknown slug
  if (index === -1) {
    return (
      <div className="space-y-4 max-w-4xl">
        <h1 className="text-3xl font-mono font-bold text-quantum-cyan">Lesson not found</h1>
        <Link to="/learn/quantum-computing" className="text-quantum-cyan underline">
          ← Back to Quantum Computing
        </Link>
      </div>
    );
  }

  // Lesson view: /learn/quantum-computing/:slug
  const lesson = LESSONS[index];
  const prev = index > 0 ? LESSONS[index - 1] : null;
  const next = index < LESSONS.length - 1 ? LESSONS[index + 1] : null;

  return (
    <div className="space-y-6 max-w-4xl">
      <Link to="/learn/quantum-computing" className="text-sm text-quantum-cyan underline">
        ← All Quantum Computing lessons
      </Link>
      <div>
        <div className="text-xs font-mono text-gray-500">
          Lesson {index + 1} of {LESSONS.length}
        </div>
        <h1 className="text-4xl font-mono font-bold text-quantum-cyan mt-1">{lesson.title}</h1>
        <p className="mt-3 text-gray-300 max-w-2xl">{lesson.intro}</p>
        <p className="mt-3 text-sm text-gray-400">
          Source: Microsoft Learn —{' '}
          <a
            href={lesson.source.url}
            target="_blank"
            rel="noreferrer"
            className="text-quantum-cyan underline"
          >
            {lesson.source.title}
          </a>
        </p>
      </div>
      <div className="card-quantum overflow-hidden">
        <iframe
          src={lesson.animation}
          title={`${lesson.title} — interactive animation`}
          className="w-full block border-0"
          style={{ height: '680px' }}
          sandbox="allow-scripts"
        />
      </div>
      <div className="card-quantum p-5">
        <div className="text-sm font-mono font-bold text-quantum-cyan">
          Check your understanding
        </div>
        <p className="text-gray-300 mt-2">{lesson.check.question}</p>
        <details className="mt-3">
          <summary className="text-sm text-quantum-cyan cursor-pointer underline">
            Show the answer
          </summary>
          <p className="text-sm text-gray-400 mt-2">{lesson.check.answer}</p>
        </details>
      </div>
      <div className="flex items-center justify-between pt-2">
        {prev ? (
          <Link to={`/learn/quantum-computing/${prev.slug}`} className="btn-outline no-underline">
            ← {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link to={`/learn/quantum-computing/${next.slug}`} className="btn-cyan no-underline">
            Next: {next.title} →
          </Link>
        ) : (
          <span className="text-sm text-gray-400">That is the whole track — for now. New lessons land here as they are made.</span>
        )}
      </div>
    </div>
  );
}
