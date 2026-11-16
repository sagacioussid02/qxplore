import { Link, useParams } from 'react-router-dom';

// Quantum Computing — a beginner-friendly track of short, animated lessons.
// Mirrors the ML Foundations track: each lesson's animation is a self-contained
// HTML file shipped as a static asset under
// public/lessons/quantum-computing/animations/ and embedded below in an iframe,
// so new lessons can be added without touching app code: drop the HTML file in
// that folder and add one entry to LESSONS. Each lesson ends with one
// check-your-understanding question. Topic provenance (which Microsoft Learn
// module or Quantum Kata each lesson is based on) lives in the track plan
// file, not on the page: lessons stay original and generic.
const LESSONS = [
  {
    slug: 'what-quantum-computing-is',
    title: 'What Quantum Computing Is (and Isn’t)',
    intro:
      'A classical computer stores information in bits — each one is a 0 or a 1, and it works through possibilities one at a time. A quantum computer stores information in qubits, which can hold a mix of 0 and 1 at the same time, and qubits can be linked so their states depend on each other. That lets a quantum computer explore many possibilities in a structured way at once — but only for certain kinds of problems. It is a specialist tool, not a faster laptop: it will not load web pages quicker or make your spreadsheets snappier.',
    animation: '/lessons/quantum-computing/animations/what-quantum-computing-is.html',
    check: {
      question:
        'A friend says a quantum computer is just a super-fast laptop that will make every program run faster. What is wrong with that?',
      answer:
        'A quantum computer only speeds up specific kinds of problems — searching unsorted data, factoring large numbers, simulating molecules. For everyday tasks like loading a web page, a classical computer is faster, cheaper, and better. Quantum computers are specialists that work alongside classical computers, not replacements for them.',
    },
  },
  {
    slug: 'the-qubit',
    title: 'The Qubit',
    intro:
      'A bit is either 0 or 1. A qubit is richer: it can be 0, 1, or any mix of the two. The mix is written as a state vector, |ψ⟩ = α|0⟩ + β|1⟩, where the two numbers α and β are called amplitudes — they say how much of each outcome is in the mix. The amplitudes are not the probabilities themselves; their squares are. Measure the qubit and you get 0 with probability |α|² and 1 with probability |β|², and the two probabilities always add to 1. The moment you measure, the mix collapses: the qubit becomes whichever outcome you saw, and the other possibility is gone. Worked example: a qubit in the state (3/5)|0⟩ + (4/5)|1⟩ gives 0 with probability (3/5)² = 9/25 = 36% and 1 with probability (4/5)² = 16/25 = 64%.',
    animation: '/lessons/quantum-computing/animations/the-qubit.html',
    check: {
      question:
        'A qubit is in the state |ψ⟩ = (1/√2)|0⟩ + (1/√2)|1⟩. If you measure it, what is the probability of seeing 0, and what happens to the qubit right after the measurement?',
      answer:
        'The probability of 0 is (1/√2)² = 1/2, so 50% — and the same 50% for 1. Measuring collapses the mix: if you saw 0, the qubit is now exactly |0⟩, so measuring it again gives 0 every time. One measurement tells you the outcome, not the mix — the 50/50 only shows up if you prepare the same state and measure it many times over.',
    },
  },
  {
    slug: 'first-quantum-program',
    title: 'Your First Quantum Program: A Quantum Random Number Generator',
    intro:
      'A quantum program is a short list of steps run on qubits: start with a fresh qubit, apply gates to shape it, then measure to read an answer out. The classic first program is a quantum coin flip — one random bit, in three lines (shown here in Q#, the example language used through this track): "use q = Qubit();" borrows a fresh qubit, which always starts in |0⟩; "H(q);" applies a Hadamard gate, mixing it into an even 50/50 superposition of |0⟩ and |1⟩; "return M(q);" measures it, collapsing the mix to a 0 or a 1, fifty-fifty. Worked example: run the program once and you might get 1. Run it eight times and you might get 1 0 1 1 0 0 1 0 — read as a byte, 10110010, which is 178 in decimal. Run it again and you get a different byte. A classical random-number generator follows a formula from a starting seed, so its numbers are really a fixed sequence in disguise; here there is no seed and no formula — the randomness comes from measuring a superposition, fresh on every run.',
    animation: '/lessons/quantum-computing/animations/first-quantum-program.html',
    check: {
      question:
        'What happens if you leave out the H(q) line — the Hadamard step — and run the program? What do you get every time, and why?',
      answer:
        'You get 0 every single time. A fresh qubit always starts in |0⟩, and measuring it without changing it just reads that 0 back. The Hadamard is what creates the 50/50 mix — without it there is no randomness at all. The randomness comes from measuring a superposition, not from the measurement itself: measure a qubit that is already certain and you learn nothing new.',
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
            definition. Start at the top; each lesson builds on the ones before it.
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
