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
  {
    slug: 'dirac-notation-bloch-sphere',
    title: 'Dirac Notation and the Bloch Sphere',
    intro:
      'Dirac notation is the shorthand for writing qubit states. A state is written as a ket, |ψ⟩ — the angle brackets are just a container for the label inside. Flip a ket around and you get its mirror image, a bra, ⟨ψ|. Put a bra and a ket together and you get a bracket, ⟨φ|ψ⟩, which measures how much two states agree: 1 means identical, 0 means completely different — orthogonal. A measurement probability is a bracket in disguise: the chance of seeing 0 is |⟨0|ψ⟩|², the overlap of your state with |0⟩, squared. The Bloch sphere is the picture that goes with the notation: every possible single-qubit state is one point on a sphere. The north pole is |0⟩, the south pole is |1⟩, and every other point is a mix. Two angles pin the point down: θ, measured down from the north pole, sets the probabilities — P(0) = cos²(θ/2), P(1) = sin²(θ/2); and φ, the angle around the equator, is the phase — it changes nothing about the measurement probabilities, but it is a real part of the state, and gates can feel it. Worked example: the state (1/√2)|0⟩ + (1/√2)|1⟩ sits on the equator at θ = 90°, φ = 0° — the point called |+⟩. Its mirror image across the sphere, (1/√2)|0⟩ − (1/√2)|1⟩, sits opposite at φ = 180° — the point called |−⟩. Both measure 50/50, and ⟨+|−⟩ = 0: they are as different as two qubit states can be, even though a plain measurement cannot tell them apart.',
    animation: '/lessons/quantum-computing/animations/dirac-notation-bloch-sphere.html',
    check: {
      question:
        'A qubit sits at θ = 120°, φ = 0° on the Bloch sphere. What is the probability of measuring 0, and is the state closer to |0⟩ or to |1⟩?',
      answer:
        'P(0) = cos²(θ/2) = cos²(60°) = (1/2)² = 25%, so P(1) = 75% — the state is closer to the south pole, |1⟩. Any point below the equator (θ > 90°) makes 1 more likely than 0. The φ = 0° only says which side of the sphere the point is on; it does not change the probabilities.',
    },
  },
  {
    slug: 'superposition-hands-on',
    title: 'Superposition, Hands-On',
    intro:
      'The Hadamard gate, H, is the mixer: it turns a certain qubit into an even 50/50 mix. H|0⟩ = |+⟩ = (|0⟩ + |1⟩)/√2 and H|1⟩ = |−⟩ = (|0⟩ − |1⟩)/√2 — both measure 50/50, but the minus sign in |−⟩ is a real difference: a plain measurement cannot see it, but the next gate can. The most useful fact about H is that applying it twice cancels it out: H² is the identity, so H|+⟩ = |0⟩ and H|−⟩ = |1⟩. Superposition is a reversible turn you can undo, not randomness being injected. And before you measure anything, you can ask a simulator to print the whole state vector — every amplitude, minus sign included — which is how you check a circuit: the printout shows the mix itself, while one measurement only ever shows a single outcome. Worked example: start in |0⟩, apply H once, and you have |+⟩ — measure 100 times and you land near 50 zeros and 50 ones. Apply H a second time and the mix undoes itself: you are back at |0⟩, and every measurement gives 0. The same happens from |1⟩: H gives |−⟩, and a second H returns |1⟩.',
    animation: '/lessons/quantum-computing/animations/superposition-hands-on.html',
    check: {
      question:
        'A qubit starts in |1⟩. You apply H twice, then measure. What do you get — and what would you have got if you had measured after just one H?',
      answer:
        'After two H gates you are back at |1⟩, so you measure 1 every single time: H|1⟩ = |−⟩, and H|−⟩ = |1⟩, because the second Hadamard undoes the first. If you had measured after just one H, you would be in |−⟩ — an even 50/50 mix — so you would see about half 0s and half 1s over many runs. The two-H result is the proof: superposition is a reversible rotation, not randomness.',
    },
  },
  {
    slug: 'single-qubit-gates',
    title: 'Single-Qubit Gates',
    intro:
      'A gate is a move you can make to a qubit — a rotation of its state on the Bloch sphere. Every gate is reversible: each one has an inverse that undoes it, and no gate ever changes the total probability, which always stays 1. There are only a few single-qubit gates you need to know by name. X is the bit-flip: it swaps |0⟩ and |1⟩, like a classical NOT. Z is the phase-flip: it leaves |0⟩ alone and flips the sign of |1⟩, so Z|1⟩ = −|1⟩ and Z|+⟩ = |−⟩ — the probabilities do not change at all, only the phase. Y does both at once: it flips the bit and adds a phase. H is the mixer you already know: it turns |0⟩ into |+⟩ and |1⟩ into |−⟩. Then come the smaller turns around the north–south axis: S is a quarter-turn of phase (S|1⟩ = i|1⟩, and two S gates make a Z), and T is an eighth-turn (T|1⟩ = e^{iπ/4}|1⟩, and two T gates make an S). Finally there are the rotation gates Rx, Ry and Rz, which turn the state by any angle you choose around an axis — X, Y and Z are just 180° rotations, and S and T are smaller turns of the same kind. Worked example: start in |0⟩ and apply H, then Z, then H again. H makes |+⟩, Z flips it to |−⟩, and the second H turns |−⟩ into |1⟩ — so H–Z–H turns |0⟩ into |1⟩. Leave out the Z and the two Hadamards simply cancel, leaving |0⟩. The Z gate changes nothing a direct measurement could see, yet it completely changes the outcome: that is why phase matters.',
    animation: '/lessons/quantum-computing/animations/single-qubit-gates.html',
    check: {
      question:
        'A qubit starts in |0⟩. You apply H, then Z, then H, and measure. What do you get every time — and what would you have got if you had left the Z out?',
      answer:
        'With the Z you get 1 every time: H|0⟩ = |+⟩, Z flips the phase so |+⟩ becomes |−⟩, and H|−⟩ = |1⟩. Without the Z, the two Hadamards cancel — H² is the identity — so you are back at |0⟩ and measure 0 every time. A phase flip is invisible to a measurement taken right after it, but the next gate can feel it, and here it flips the final answer from 0 to 1.',
    },
  },
  {
    slug: 'measurement',
    title: 'Measurement',
    intro:
      'Measurement is how a quantum answer leaves the quantum world: it reads a qubit and returns a plain classical bit, 0 or 1. But it is not a peek at the mix — it is a collapse. The probabilities come from the amplitudes, P(0) = |α|² and P(1) = |β|², yet one measurement only ever shows a single outcome, never the probabilities themselves. And the moment you measure, the mix is gone: the qubit becomes whichever outcome you saw, so measuring the same qubit again gives the same answer every time. To learn the probabilities you have to prepare the same state over and over and count the outcomes — each fresh copy is a new roll of the same loaded dice. There is one more subtlety: the measurement itself is a choice. The plain way reads in the Z basis, 0 versus 1. But you can measure in a different basis — apply an H gate first, then read — and that asks a different question: is the state |+⟩ or |−⟩? That matters, because some states are twins in one basis and strangers in another: |+⟩ and |−⟩ both measure 50/50 the plain way, so no plain measurement can tell them apart, yet in the X basis |+⟩ always gives 0 and |−⟩ always gives 1. Worked example: a qubit in the state (3/5)|0⟩ + (4/5)|1⟩ gives 0 with probability (3/5)² = 36% and 1 with probability (4/5)² = 64%. Suppose you measure it and see 1: the qubit has collapsed to exactly |1⟩, and measuring it again gives 1 every single time. The 36/64 split only appears across many fresh preparations — one measurement tells you the outcome, not the mix.',
    animation: '/lessons/quantum-computing/animations/measurement.html',
    check: {
      question:
        'One qubit is in |+⟩ and another is in |−⟩. You measure both the plain way (the Z basis). What do you see — and how could a different measurement tell the two states apart?',
      answer:
        'Both measure 50/50 the plain way, so the outcomes tell you nothing: you see a mix of 0s and 1s from either qubit, and no plain measurement can distinguish |+⟩ from |−⟩. Measure in the X basis instead — apply an H gate first, then read: |+⟩ always gives 0 and |−⟩ always gives 1, because H|+⟩ = |0⟩ and H|−⟩ = |1⟩. The two states are as different as states can be (their overlap is zero), but only the right measurement question reveals the difference.',
    },
  },
  {
    slug: 'multi-qubit-systems',
    title: 'Multi-Qubit Systems and Joint Measurement',
    intro:
      'One qubit holds a mix of two outcomes, 0 and 1. Two qubits hold a mix of four: 00, 01, 10 and 11. The register is written as one state with four amplitudes — one for each outcome — and the probabilities, the squares of the amplitudes, always add to 1. Three qubits need eight amplitudes, four need sixteen, and ten need 1,024: the number of outcomes doubles with every qubit you add, 2^n in total. That is the whole reason a quantum computer can hold so much at once — and also why simulating one on a classical computer gets hard so fast. If the two qubits are independent, the joint state is just the product of the two single-qubit states — the tensor product, written ⊗. Each qubit keeps its own mix, and the joint probabilities multiply: a 50/50 qubit next to a certain-0 qubit gives 00 half the time and 10 half the time, never 01 or 11. Measuring the register reads out a whole bitstring at once. But you can also measure just one qubit of the register — a partial measurement. That collapses only the qubit you read; the other one survives, re-weighted to the outcomes that are still possible. And a measurement is a question you choose: each qubit can be read in the Z basis (0 vs 1), the X basis (+ vs −), or the Y basis — the three Pauli bases — and a joint measurement can ask about a combination, like whether the two bits agree (Z⊗Z, the parity). Worked example: put the first qubit in |+⟩ and the second in |0⟩. The joint state is |+⟩⊗|0⟩ = (|00⟩ + |10⟩)/√2. Measure the whole register and you get 00 with probability 50% and 10 with probability 50%; 01 and 11 never appear, because the second qubit is certain 0. Measure only the first qubit and get 1: the second qubit is still |0⟩ — reading one independent qubit leaves the other untouched. Not every two-qubit state splits into a product like this one — the ones that do not are entangled, and that is the next lesson.',
    animation: '/lessons/quantum-computing/animations/multi-qubit-systems.html',
    check: {
      question:
        'A register has three qubits, each in |+⟩. How many outcomes can measuring the whole register give, and what is the probability of seeing 000? And what happens to the other two qubits if you measure only the first one and get 1?',
      answer:
        'Eight outcomes — 2³ — each equally likely, so 000 has probability 1/8: each qubit contributes a factor of 1/2, since (1/√2)² = 1/2, three times over. Measuring the first qubit only collapses just that qubit: it becomes |1⟩, and the other two are untouched, still in |+⟩|+⟩. The three qubits are independent, so reading one leaves the rest exactly as they were — the state splits into a product, and a partial measurement only touches the part you read.',
    },
  },
  {
    slug: 'entanglement-bell-states',
    title: 'Entanglement and Bell States',
    intro:
      'Two qubits can be linked in a way that has no classical counterpart: entangled. The simplest entangled pair is the Bell state Φ⁺ = (|00⟩ + |11⟩)/√2. Measure the whole register and you get 00 half the time and 11 half the time — 01 and 10 never appear. Measure just the first qubit and you instantly know the second: see 0 and the second is certainly 0, see 1 and it is certainly 1 — even though each qubit on its own, measured alone, is a perfectly random 50/50 coin. That is the strange part: neither qubit has a state of its own. You cannot write Φ⁺ as a product of two single-qubit states: a product (a|0⟩ + b|1⟩) ⊗ (c|0⟩ + d|1⟩) would need the |00⟩ and |11⟩ terms to be non-zero while the |01⟩ and |10⟩ terms are zero, and the arithmetic makes that impossible — if a and d are both non-zero, then the |01⟩ term ad cannot be zero. The pair has a joint state that its parts do not have. Entangled pairs are made with two gates: a Hadamard on the first qubit, then a CNOT — a controlled-NOT that flips the second qubit only where the first is 1. Start in |00⟩, apply H to the first qubit and you have (|00⟩ + |10⟩)/√2 — still two independent qubits, each with its own state. Apply the CNOT and the |10⟩ term becomes |11⟩, giving (|00⟩ + |11⟩)/√2 — and now the qubits can no longer be described separately. There are four Bell states in total: Φ⁺ = (|00⟩ + |11⟩)/√2 and Φ⁻ = (|00⟩ − |11⟩)/√2, in which the bits always agree, and Ψ⁺ = (|01⟩ + |10⟩)/√2 and Ψ⁻ = (|01⟩ − |10⟩)/√2, in which they always disagree — the minus sign changes the phase, not the probabilities. Worked example: prepare Φ⁺ and measure the register 100 times — you land near 50 × 00 and 50 × 11, and never see 01 or 10. Now take a fresh pair and measure only the first qubit: half the time you see 0 and the second qubit becomes certainly |0⟩; half the time you see 1 and it becomes certainly |1⟩. Compare with the independent pair |+⟩⊗|0⟩ from the last lesson: measuring its first qubit never changes the second, because the two still have states of their own.',
    animation: '/lessons/quantum-computing/animations/entanglement-bell-states.html',
    check: {
      question:
        'A pair of qubits is in the Bell state Φ⁺ = (|00⟩ + |11⟩)/√2. You measure the first qubit and see 1. What is the second qubit now — and could this state have been written as two separate single-qubit states?',
      answer:
        'The second qubit is now certainly |1⟩: in Φ⁺ the two bits always agree, so seeing 1 on the first fixes the second to 1 — even though, before the measurement, each qubit on its own was 50/50. And no, it cannot be written as a product: a product (a|0⟩ + b|1⟩) ⊗ (c|0⟩ + d|1⟩) would need ac = 1/√2 and bd = 1/√2 for the |00⟩ and |11⟩ terms, while ad = 0 and bc = 0 for the |01⟩ and |10⟩ terms — but if a and d are both non-zero, ad cannot be zero. That impossibility is what entanglement is: the pair has a state that neither qubit has on its own.',
    },
  },
  {
    slug: 'quantum-teleportation',
    title: 'Quantum Teleportation',
    intro:
      'Entanglement lets you move a quantum state without moving the qubit that holds it — that is quantum teleportation. Alice has a qubit in a state |ψ⟩ = α|0⟩ + β|1⟩ she wants to send to Bob, and the two of them already share an entangled pair in the Bell state Φ⁺. The protocol has three moves. First, Alice entangles her message qubit with her half of the pair: a CNOT with the message qubit as the control, then a Hadamard on the message qubit. Second, Alice measures her two qubits, which gives two ordinary classical bits — 00, 01, 10 or 11, each equally likely — and that measurement destroys her copy of |ψ⟩: a quantum state cannot be copied, so the original is gone the moment it is read. Third, Alice sends the two bits to Bob by any ordinary channel — a phone call, a radio link — and Bob applies a correction to his half of the pair that depends on the bits: 00 means do nothing, 01 means apply X, 10 means apply Z, 11 means apply X then Z. After the correction, Bob’s qubit is exactly |ψ⟩. The state has moved; no qubit travelled anywhere. Two things teleportation cannot do: it cannot go faster than light, because before the classical bits arrive Bob’s qubit holds nothing about |ψ⟩ — it is a featureless 50/50 mix no matter what |ψ⟩ was — and it cannot copy a state, because Alice’s measurement erases the original. Worked example: teleport |ψ⟩ = (3/5)|0⟩ + (4/5)|1⟩. Each of Alice’s four outcomes has probability 1/4. Suppose she measures 01: Bob holds (4/5)|0⟩ + (3/5)|1⟩ — the amplitudes are swapped — so he applies X, swapping them back, and his qubit is exactly |ψ⟩.',
    animation: '/lessons/quantum-computing/animations/quantum-teleportation.html',
    check: {
      question:
        'Alice measures 10. What correction does Bob apply — and why can’t Bob recover the state before the two classical bits reach him?',
      answer:
        'Bob applies Z: for the outcome 10 his qubit holds α|0⟩ − β|1⟩, and Z flips the sign of the |1⟩ term, giving back α|0⟩ + β|1⟩ = |ψ⟩. Before the bits arrive he cannot recover anything: his qubit measures 50/50 for every possible |ψ⟩, so it carries no information about the state at all. The entanglement alone sends nothing — the two classical bits are what tell him which correction to apply, and they travel no faster than light.',
    },
  },
  {
    slug: 'superdense-coding',
    title: 'Superdense Coding',
    intro:
      'Entanglement is not just a curiosity — it is a resource you can spend. Superdense coding is the first protocol that spends it: it sends two classical bits by shipping only one qubit. Here is the deal. Alice and Bob already share an entangled pair in the Bell state Φ⁺, one qubit each. Alice wants to send Bob a two-bit message — 00, 01, 10 or 11. She does it by touching only her own qubit: she applies one of four gates to her half, and each gate turns the shared pair into a different Bell state. Doing nothing (the identity) leaves Φ⁺; an X flip makes Ψ⁺; a Z flip makes Φ⁻; X then Z makes Ψ⁻. Four messages, four Bell states — the two bits are now stored in which Bell state the pair is in. Then Alice sends her single qubit to Bob. Bob now holds both qubits, and he reads the message out with a Bell measurement: a CNOT with Alice’s qubit as the control, a Hadamard on Alice’s qubit, then a plain measurement of both. Φ⁺ reads out as 00, Ψ⁺ as 01, Φ⁻ as 10, Ψ⁻ as 11 — always the two bits Alice chose. One qubit travelled; two bits arrived. Why does this not break the rules? A lone qubit can carry at most one classical bit — that is a hard limit. The second bit rode on the entanglement Alice and Bob shared in advance: the pair was set up before the message was even chosen. And it does not send anything faster than light, because Bob can read nothing until Alice’s qubit physically reaches him. Worked example: Alice wants to send 10. She applies Z to her half of Φ⁺, turning the pair into Φ⁻ = (|00⟩ − |11⟩)/√2, and sends her qubit to Bob. Bob’s Bell measurement — the CNOT turns Φ⁻ into (|00⟩ − |10⟩)/√2, the Hadamard turns that into |10⟩ — reads out 10, exactly the bits Alice sent.',
    animation: '/lessons/quantum-computing/animations/superdense-coding.html',
    check: {
      question:
        'Alice wants to send the message 11. Which gate does she apply to her half of the pair, what Bell state does the pair become, and what does Bob’s Bell measurement read out? And why could she not have sent two bits by shipping one qubit with no shared pair?',
      answer:
        'She applies X then Z (either order — the difference is only a global minus sign, which is not a physical difference). Her half flips and gains a phase, and the pair becomes Ψ⁻ = (|01⟩ − |10⟩)/√2. Bob’s Bell measurement turns Ψ⁻ into |11⟩, so he reads 11. Without the shared pair there would be nothing for the gates to act on jointly: a single qubit sent alone can carry at most one classical bit — Alice could encode one bit as |0⟩ or |1⟩, but the second bit would have nowhere to go, and Bob would have to guess it. The entanglement set up in advance is what carries the second bit.',
    },
  },
  {
    slug: 'quantum-circuits-oracles',
    title: 'Quantum Circuits and Oracles',
    intro:
      'A quantum circuit is a picture of a quantum program: each horizontal wire is a qubit, time runs left to right, and each box on a wire is a gate. You have already been reading circuits this way — a Hadamard on the top wire, a CNOT joining two wires — without calling them that. Circuits matter because real quantum algorithms are not written as one long list of gates; they are built from named blocks, and the most important block is the oracle. An oracle is a box that stands for a classical function f — it computes f without telling you how. You hand it an input, it hands back the answer, and the algorithm that calls it never looks inside. That sounds like cheating, but it is how algorithm designers count cost: the question is not how fast f is to compute, it is how many times the algorithm has to ask. If a quantum algorithm answers a question with one oracle call where a classical one needs many, that is a genuine speedup — and the next lesson is the first example. There are two ways to package a function as an oracle. The bit oracle writes the answer into an extra qubit: U_f |x⟩|y⟩ = |x⟩|y ⊕ f(x)⟩. Give it the input x and a spare qubit y, and it flips the spare qubit exactly when f(x) = 1. The phase oracle stores the same answer as a sign: U_f |x⟩ = (−1)^f(x) |x⟩ — the amplitude of |x⟩ flips sign when f(x) = 1, and stays put when f(x) = 0. The two are the same box, wired differently, and the trick that converts one into the other is called phase kickback. Prepare the spare qubit in the state |−⟩ = (|0⟩ − |1⟩)/√2. That state is special: flipping it changes nothing but a minus sign, X|−⟩ = −|−⟩. So when the bit oracle flips the spare qubit — which it does exactly when f(x) = 1 — the minus sign has nowhere to go but back onto the input: U_f |x⟩|−⟩ = (−1)^f(x) |x⟩|−⟩. The spare qubit comes out exactly as it went in, |−⟩, and the input now carries the answer as a phase. A phase is invisible to a direct measurement — |+⟩ and |−⟩ both measure 50/50 — but the next gate can feel it, and that is the whole point: algorithms like the one in the next lesson read the phase out with interference. Worked example: take f(x) = NOT x, so f(0) = 1 and f(1) = 0. The bit oracle flips the spare qubit when the input is 0 and leaves it when the input is 1: |0⟩|0⟩ becomes |0⟩|1⟩, while |1⟩|0⟩ stays |1⟩|0⟩. With the spare qubit in |−⟩, the phase oracle gives −|0⟩ for input 0 and +|1⟩ for input 1 — so on the superposition |+⟩ = (|0⟩ + |1⟩)/√2 it returns (−|0⟩ + |1⟩)/√2, which is |−⟩ up to an overall minus sign that carries no information. Constant functions do nothing at all to |+⟩: if f is always 0 nothing flips, and if f is always 1 both terms flip, which is again just an overall sign. So the phase oracle sorts functions into two camps — the constants leave |+⟩ alone, and the balanced ones (identity, NOT) turn it into |−⟩. That sorting is exactly what the next lesson exploits.',
    animation: '/lessons/quantum-computing/animations/quantum-circuits-oracles.html',
    check: {
      question:
        'Take f(x) = x, the identity: f(0) = 0 and f(1) = 1. What does the phase oracle do to the superposition |+⟩ — and would a plain measurement of the result tell you anything had happened?',
      answer:
        'It turns |+⟩ into |−⟩: the |0⟩ term keeps its sign, since f(0) = 0, while the |1⟩ term flips, since f(1) = 1, giving (|0⟩ − |1⟩)/√2 = |−⟩. A plain measurement would tell you nothing — |+⟩ and |−⟩ both measure 50/50, so the probabilities are identical and the phase leaves no trace. To see the difference you need another gate, like a Hadamard, to turn the phase difference into a probability difference. That interference is what the next lesson uses.',
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
