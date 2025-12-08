"use client"

import { useState } from "react"
import { BookOpen, Brain, CheckCircle2, XCircle, SkipForward, Loader, RefreshCw } from "lucide-react"

interface Flashcard {
  question: string
  answer: string
  context: string
  type: string
  entity_label: string
  confidence: number
}

interface QuizResult {
  question: string
  user_answer: string
  correct_answer: string
  status: 'correct' | 'incorrect' | 'skipped'
  score?: number
}

export function FlashcardGenerator() {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [mode, setMode] = useState<"generate" | "study" | "quiz">("generate")
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [userAnswer, setUserAnswer] = useState("")
  const [quizResults, setQuizResults] = useState<QuizResult[]>([])
  const [maxCards, setMaxCards] = useState(10)

  const generateFlashcards = async () => {
    setLoading(true)
    setError("")
    
    try {
      const response = await fetch("http://localhost:5000/api/flashcards/generate-from-documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ max_cards: maxCards })
      })
      
      if (!response.ok) {
        throw new Error("Failed to generate flashcards")
      }
      
      const data = await response.json()
      setFlashcards(data.flashcards)
      setMode("study")
      setCurrentIndex(0)
      setShowAnswer(false)
      setQuizResults([])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const checkAnswer = async () => {
    if (!userAnswer.trim()) return
    
    const currentCard = flashcards[currentIndex]
    
    try {
      const response = await fetch("http://localhost:5000/api/flashcards/check-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_answer: userAnswer,
          correct_answer: currentCard.answer,
          threshold: 0.65
        })
      })
      
      const result = await response.json()
      
      const quizResult: QuizResult = {
        question: currentCard.question,
        user_answer: userAnswer,
        correct_answer: currentCard.answer,
        status: result.is_correct ? 'correct' : 'incorrect',
        score: result.score
      }
      
      setQuizResults([...quizResults, quizResult])
      setUserAnswer("")
      
      // Auto-advance after 2 seconds
      setTimeout(() => {
        if (currentIndex < flashcards.length - 1) {
          setCurrentIndex(currentIndex + 1)
        }
      }, 2000)
    } catch (err) {
      console.error("Error checking answer:", err)
    }
  }

  const skipCard = () => {
    const currentCard = flashcards[currentIndex]
    const quizResult: QuizResult = {
      question: currentCard.question,
      user_answer: 'SKIPPED',
      correct_answer: currentCard.answer,
      status: 'skipped'
    }
    setQuizResults([...quizResults, quizResult])
    setUserAnswer("")
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const resetQuiz = () => {
    setCurrentIndex(0)
    setQuizResults([])
    setUserAnswer("")
    setShowAnswer(false)
  }

  const currentCard = flashcards[currentIndex]
  const progress = flashcards.length > 0 ? ((currentIndex + 1) / flashcards.length) * 100 : 0
  const correctCount = quizResults.filter(r => r.status === 'correct').length
  const incorrectCount = quizResults.filter(r => r.status === 'incorrect').length
  const skippedCount = quizResults.filter(r => r.status === 'skipped').length
  const accuracy = quizResults.length > 0 ? (correctCount / quizResults.length * 100).toFixed(1) : 0

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-8">
        <BookOpen size={32} className="text-accent" />
        <div>
          <h2 className="text-3xl font-bold text-foreground">AI Flashcard Generator</h2>
          <p className="text-muted-foreground">Generate study flashcards from your documents</p>
        </div>
      </div>

      {/* Generate Section */}
      {mode === "generate" && (
        <div className="bg-card border border-border rounded-lg p-8">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Number of Flashcards
              </label>
              <input
                type="number"
                value={maxCards}
                onChange={(e) => setMaxCards(parseInt(e.target.value) || 10)}
                min="5"
                max="50"
                className="w-full px-4 py-2 bg-secondary border border-border rounded-lg text-foreground"
              />
            </div>
            
            <button
              onClick={generateFlashcards}
              disabled={loading}
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader size={20} className="animate-spin" />
                  Generating Flashcards...
                </>
              ) : (
                <>
                  <Brain size={20} />
                  Generate Flashcards from Documents
                </>
              )}
            </button>
            
            {error && (
              <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
                <p className="text-destructive text-sm">{error}</p>
              </div>
            )}
            
            <div className="text-sm text-muted-foreground space-y-2">
              <p>• Flashcards are generated from your indexed documents using AI</p>
              <p>• Extracts key concepts, entities, and definitions</p>
              <p>• Includes medical terms, procedures, and anatomical references</p>
            </div>
          </div>
        </div>
      )}

      {/* Study Mode */}
      {mode === "study" && flashcards.length > 0 && (
        <div className="space-y-6">
          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span>Card {currentIndex + 1} of {flashcards.length}</span>
              <span>{progress.toFixed(0)}% Complete</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className="bg-accent h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Flashcard */}
          <div className="bg-card border border-border rounded-lg p-8 min-h-[300px] flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs font-semibold px-3 py-1 bg-accent/20 text-accent rounded-full">
                  {currentCard.entity_label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {(currentCard.confidence * 100).toFixed(0)}% confidence
                </span>
              </div>
              
              <h3 className="text-xl font-semibold text-foreground mb-4">
                {currentCard.question}
              </h3>
              
              {showAnswer && (
                <div className="mt-6 p-4 bg-accent/10 rounded-lg border border-accent/20">
                  <p className="text-sm font-medium text-accent mb-2">Answer:</p>
                  <p className="text-foreground">{currentCard.answer}</p>
                </div>
              )}
            </div>
            
            <div className="flex gap-4 mt-6">
              <button
                onClick={() => setShowAnswer(!showAnswer)}
                className="flex-1 bg-secondary hover:bg-secondary/80 text-foreground font-medium py-3 px-6 rounded-lg transition-colors"
              >
                {showAnswer ? "Hide Answer" : "Show Answer"}
              </button>
              {currentIndex < flashcards.length - 1 && (
                <button
                  onClick={() => {
                    setCurrentIndex(currentIndex + 1)
                    setShowAnswer(false)
                  }}
                  className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground font-medium py-3 px-6 rounded-lg transition-colors"
                >
                  Next Card
                </button>
              )}
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex gap-4">
            <button
              onClick={() => setMode("quiz")}
              className="flex-1 bg-accent/20 hover:bg-accent/30 text-accent font-medium py-3 px-6 rounded-lg transition-colors"
            >
              Switch to Quiz Mode
            </button>
            <button
              onClick={() => {
                setMode("generate")
                setFlashcards([])
                resetQuiz()
              }}
              className="bg-secondary hover:bg-secondary/80 text-foreground font-medium py-3 px-6 rounded-lg transition-colors flex items-center gap-2"
            >
              <RefreshCw size={16} />
              New Set
            </button>
          </div>
        </div>
      )}

      {/* Quiz Mode */}
      {mode === "quiz" && flashcards.length > 0 && (
        <div className="space-y-6">
          {/* Stats Bar */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-card border border-border rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-foreground">{currentIndex + 1}/{flashcards.length}</div>
              <div className="text-xs text-muted-foreground">Progress</div>
            </div>
            <div className="bg-card border border-green-500/20 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-500">{correctCount}</div>
              <div className="text-xs text-muted-foreground">Correct</div>
            </div>
            <div className="bg-card border border-red-500/20 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-red-500">{incorrectCount}</div>
              <div className="text-xs text-muted-foreground">Incorrect</div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-accent">{accuracy}%</div>
              <div className="text-xs text-muted-foreground">Accuracy</div>
            </div>
          </div>

          {currentIndex < flashcards.length ? (
            <div className="bg-card border border-border rounded-lg p-8">
              <div className="mb-6">
                <span className="text-xs font-semibold px-3 py-1 bg-accent/20 text-accent rounded-full">
                  {currentCard.entity_label}
                </span>
              </div>
              
              <h3 className="text-xl font-semibold text-foreground mb-6">
                {currentCard.question}
              </h3>
              
              <div className="space-y-4">
                <textarea
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder="Type your answer here..."
                  className="w-full px-4 py-3 bg-secondary border border-border rounded-lg text-foreground min-h-[100px] resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.ctrlKey) {
                      checkAnswer()
                    }
                  }}
                />
                
                <div className="flex gap-4">
                  <button
                    onClick={checkAnswer}
                    disabled={!userAnswer.trim()}
                    className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground font-medium py-3 px-6 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={18} />
                    Submit Answer
                  </button>
                  <button
                    onClick={skipCard}
                    className="bg-secondary hover:bg-secondary/80 text-foreground font-medium py-3 px-6 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <SkipForward size={18} />
                    Skip
                  </button>
                </div>
                
                {quizResults.length > 0 && quizResults[quizResults.length - 1] && (
                  <div className={`p-4 rounded-lg border ${
                    quizResults[quizResults.length - 1].status === 'correct' 
                      ? 'bg-green-500/10 border-green-500/20' 
                      : quizResults[quizResults.length - 1].status === 'incorrect'
                      ? 'bg-red-500/10 border-red-500/20'
                      : 'bg-yellow-500/10 border-yellow-500/20'
                  }`}>
                    {quizResults[quizResults.length - 1].status === 'correct' && (
                      <div className="flex items-start gap-3">
                        <CheckCircle2 size={20} className="text-green-500 flex-shrink-0 mt-1" />
                        <div>
                          <p className="font-semibold text-green-500">Correct!</p>
                          <p className="text-sm text-muted-foreground">Score: {(quizResults[quizResults.length - 1].score! * 100).toFixed(0)}%</p>
                        </div>
                      </div>
                    )}
                    {quizResults[quizResults.length - 1].status === 'incorrect' && (
                      <div className="flex items-start gap-3">
                        <XCircle size={20} className="text-red-500 flex-shrink-0 mt-1" />
                        <div className="space-y-2">
                          <p className="font-semibold text-red-500">Incorrect</p>
                          <p className="text-sm text-foreground">Correct answer: {quizResults[quizResults.length - 1].correct_answer}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-lg p-8 text-center space-y-6">
              <h3 className="text-2xl font-bold text-foreground">Quiz Complete! 🎉</h3>
              <div className="text-6xl font-bold text-accent">{accuracy}%</div>
              <p className="text-muted-foreground">
                {correctCount} correct • {incorrectCount} incorrect • {skippedCount} skipped
              </p>
              
              <div className="flex gap-4 justify-center">
                <button
                  onClick={resetQuiz}
                  className="bg-accent hover:bg-accent/90 text-accent-foreground font-medium py-3 px-6 rounded-lg transition-colors flex items-center gap-2"
                >
                  <RefreshCw size={18} />
                  Retry Quiz
                </button>
                <button
                  onClick={() => setMode("study")}
                  className="bg-secondary hover:bg-secondary/80 text-foreground font-medium py-3 px-6 rounded-lg transition-colors"
                >
                  Review Cards
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={() => setMode("study")}
              className="flex-1 bg-secondary hover:bg-secondary/80 text-foreground font-medium py-3 px-6 rounded-lg transition-colors"
            >
              Switch to Study Mode
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
