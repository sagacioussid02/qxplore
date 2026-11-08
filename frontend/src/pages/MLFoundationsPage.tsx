import { Link, useParams } from 'react-router-dom';

// ML Foundations — a beginner-friendly track of short, animated lessons.
// Each lesson's animation is a self-contained HTML file shipped as a static
// asset under public/lessons/ml-foundations/animations/ and embedded below
// in an iframe, so new lessons can be added without touching app code:
// drop the HTML file in that folder and add one entry to LESSONS.
const LESSONS = [
  {
    slug: 'tokens-and-tokenization',
    title: 'Tokens and Tokenization',
    intro:
      'Language models do not read words or letters — they read chunks of text called tokens. One token is roughly three-quarters of an English word, and every size limit you will ever hit (including the context window) is counted in tokens, not words. Try typing in the animation and watch how text gets chopped up.',
    animation: '/lessons/ml-foundations/animations/tokens-and-tokenization.html',
  },
  {
    slug: 'context-window',
    title: 'The Context Window',
    intro:
      'The context window is the model\u2019s working desk: one fixed token budget shared by your instructions, the conversation history, any files you paste in, and the model\u2019s own reply. When the desk fills up, the oldest tokens fall off. A bigger desk helps, but a model does not remember everything on it equally well.',
    animation: '/lessons/ml-foundations/animations/context-window.html',
  },
  {
    slug: 'temperature-and-sampling',
    title: 'Temperature and Sampling',
    intro:
      'Before a model picks its next token, it scores every possible one. Temperature reshapes those scores: low temperature sharpens them so the safest choice almost always wins, high temperature flattens them so unlikely choices get a real shot. That reshaping is why the same prompt can produce a different answer twice.',
    animation: '/lessons/ml-foundations/animations/temperature-and-sampling.html',
  },
  {
    slug: 'embeddings',
    title: 'Embeddings: Words as Meaning-Vectors',
    intro:
      'An embedding is a list of numbers that stands in for a word. The numbers are learned so that words used in similar contexts end up near each other, which means closeness in this space is similarity of meaning. The classic party trick: king \u2212 man + woman lands almost exactly on queen.',
    animation: '/lessons/ml-foundations/animations/embeddings.html',
  },
  {
    slug: 'weights-parameters-and-layers',
    title: 'Weights, Parameters, and Layers',
    intro:
      'A weight is a single number on a connection between two neurons — a volume knob for how much that signal matters. Parameters are simply all of those numbers (GPT-3 has 175 billion of them), and layers are stacked groups of neurons, so simple patterns are learned first and complex ones later. Training is just nudging all the numbers, a little at a time, until the answers get better.',
    animation: '/lessons/ml-foundations/animations/weights-parameters-and-layers.html',
  },
];

export default function MLFoundationsPage() {
  const { slug } = useParams();
  const index = LESSONS.findIndex((lesson) => lesson.slug === slug);

  // Index view: /learn/ml-foundations
  if (!slug) {
    return (
      <div className="space-y-8 max-w-4xl">
        <div>
          <h1 className="text-4xl font-mono font-bold text-quantum-cyan">ML Foundations</h1>
          <p className="mt-3 text-gray-300 max-w-2xl">
            Machine learning, one small idea at a time. Each lesson is a short read plus an
            interactive animation you can poke at — no maths degree, no jargon without a
            definition. Start at the top; each lesson builds on the ones before it.
          </p>
        </div>
        <div className="grid gap-4">
          {LESSONS.map((lesson, i) => (
            <Link
              key={lesson.slug}
              to={`/learn/ml-foundations/${lesson.slug}`}
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
        <Link to="/learn/ml-foundations" className="text-quantum-cyan underline">
          ← Back to ML Foundations
        </Link>
      </div>
    );
  }

  // Lesson view: /learn/ml-foundations/:slug
  const lesson = LESSONS[index];
  const prev = index > 0 ? LESSONS[index - 1] : null;
  const next = index < LESSONS.length - 1 ? LESSONS[index + 1] : null;

  return (
    <div className="space-y-6 max-w-4xl">
      <Link to="/learn/ml-foundations" className="text-sm text-quantum-cyan underline">
        ← All ML Foundations lessons
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
      <div className="flex items-center justify-between pt-2">
        {prev ? (
          <Link to={`/learn/ml-foundations/${prev.slug}`} className="btn-outline no-underline">
            ← {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link to={`/learn/ml-foundations/${next.slug}`} className="btn-cyan no-underline">
            Next: {next.title} →
          </Link>
        ) : (
          <span className="text-sm text-gray-400">That is the whole track — for now. New lessons land here as they are made.</span>
        )}
      </div>
    </div>
  );
}
