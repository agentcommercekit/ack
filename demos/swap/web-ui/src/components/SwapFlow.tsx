'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Progress } from './ui/progress'
import { Separator } from './ui/separator'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import {
  ArrowRight,
  CheckCircle,
  Clock,
  AlertCircle,
  User,
  Bot,
  Coins,
  Shield,
  CreditCard,
  RefreshCw,
  RotateCcw,
  Plus
} from 'lucide-react'

interface FlowStep {
  id: string
  title: string
  description: string
  status: 'pending' | 'in-progress' | 'completed' | 'failed'
  agent: 'requestor' | 'executor' | 'ack-lab'
  details?: string[]
}

interface AgentState {
  did: string
  balance: {
    usdc: number
    eth: number
  }
  status: 'idle' | 'processing' | 'waiting'
}

export function SwapFlow() {
  const [currentStep, setCurrentStep] = useState(0)
  const [userInput, setUserInput] = useState('')
  const [chatHistory, setChatHistory] = useState<Array<{role: 'user' | 'agent', message: string, timestamp: Date}>>([])
  const [isProcessing, setIsProcessing] = useState(false)

  const [requestorState, setRequestorState] = useState<AgentState>({
    did: 'did:web:alice.example.com',
    balance: { usdc: 100, eth: 0 },
    status: 'idle'
  })

  const [executorState, setExecutorState] = useState<AgentState>({
    did: 'did:web:bob.example.com',
    balance: { usdc: 0, eth: 0.5 },
    status: 'idle'
  })

  const [flowSteps, setFlowSteps] = useState<FlowStep[]>([
    {
      id: 'identity-setup',
      title: 'Identity Setup',
      description: 'Creating agent identities and ownership credentials',
      status: 'completed',
      agent: 'ack-lab',
      details: [
        'Created Alice (Requestor) identity',
        'Created Bob (Executor) identity',
        'Issued ownership credentials',
        'Started ACK-Lab service'
      ]
    },
    {
      id: 'balance-check',
      title: 'Balance Verification',
      description: 'Check requestor balance and verify executor identity',
      status: 'pending',
      agent: 'requestor'
    },
    {
      id: 'swap-initiation',
      title: 'Swap Initiation',
      description: 'Send swap request to executor agent',
      status: 'pending',
      agent: 'requestor'
    },
    {
      id: 'identity-verification',
      title: 'Identity Verification',
      description: 'Executor verifies requestor identity',
      status: 'pending',
      agent: 'executor'
    },
    {
      id: 'payment-request',
      title: 'Payment Request',
      description: 'Executor creates payment request',
      status: 'pending',
      agent: 'executor'
    },
    {
      id: 'payment-processing',
      title: 'Payment Processing',
      description: 'Requestor sends payment via ACK-Pay',
      status: 'pending',
      agent: 'requestor'
    },
    {
      id: 'payment-verification',
      title: 'Payment Verification',
      description: 'Executor verifies payment receipt',
      status: 'pending',
      agent: 'executor'
    },
    {
      id: 'swap-execution',
      title: 'Swap Execution',
      description: 'Execute token swap and update balances',
      status: 'pending',
      agent: 'executor'
    }
  ])

  const getStatusIcon = (status: FlowStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'in-progress':
        return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />
      default:
        return <Clock className="w-5 h-5 text-gray-400" />
    }
  }

  const getAgentIcon = (agent: FlowStep['agent']) => {
    switch (agent) {
      case 'requestor':
        return <User className="w-4 h-4" />
      case 'executor':
        return <Bot className="w-4 h-4" />
      case 'ack-lab':
        return <Shield className="w-4 h-4" />
    }
  }

  const getAgentColor = (agent: FlowStep['agent']) => {
    switch (agent) {
      case 'requestor':
        return 'bg-blue-100 text-blue-800'
      case 'executor':
        return 'bg-green-100 text-green-800'
      case 'ack-lab':
        return 'bg-purple-100 text-purple-800'
    }
  }

      const executeRealSwap = async (message: string) => {
    setIsProcessing(true)
    setChatHistory(prev => [...prev, { role: 'user', message, timestamp: new Date() }])

    // Reset all steps to pending (except setup)
    const steps = [...flowSteps]
    for (let i = 1; i < steps.length; i++) {
      steps[i].status = 'pending'
      steps[i].details = undefined
    }
    setFlowSteps([...steps])
    setCurrentStep(1)

    try {
      // Call the real requestor agent
      const response = await fetch('http://localhost:5678/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: message
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to communicate with requestor agent: ${response.status}`)
      }

      const result = await response.json()

      // Add the agent's response to chat
      setChatHistory(prev => [...prev, {
        role: 'agent',
        message: result.text || 'Processing your request...',
        timestamp: new Date()
      }])

      // Parse the response to update the flow steps based on what the agent did
      const responseText = result.text || ''

      // Extract amount for balance updates
      const amountMatch = message.match(/(\d+(?:\.\d+)?)\s*(usdc|eth)/i)
      const amount = amountMatch ? parseFloat(amountMatch[1]) : 60

      // Check for various response patterns and update steps accordingly
      if (responseText.includes('Policy violation') || responseText.includes('exceeds') || responseText.includes('violation')) {
        // Policy violation during balance check/preparation
        steps[1].status = 'completed'
        steps[1].details = ['✓ Balance checked']

        steps[2].status = 'failed'
        steps[2].details = [`❌ ${responseText}`]
        setFlowSteps([...steps])
        setCurrentStep(2)

      } else if (responseText.includes('Insufficient')) {
        // Balance check failed
        steps[1].status = 'failed'
        steps[1].details = [`❌ ${responseText}`]
        setFlowSteps([...steps])
        setCurrentStep(1)

      } else if (responseText.includes('successfully') || responseText.includes('completed') || responseText.includes('Transaction:')) {
        // Successful swap - mark all steps as completed
        steps[1].status = 'completed'
        steps[1].details = [
          `✓ Balance: ${requestorState.balance.usdc} USDC verified`,
          '✓ Executor identity verified',
          '✓ Policy compliance verified'
        ]

        steps[2].status = 'completed'
        steps[2].details = [`✓ Initiated swap: ${amount} USDC → ETH`]

        steps[3].status = 'completed'
        steps[3].details = ['✓ Identity verified by executor']

        steps[4].status = 'completed'
        steps[4].details = [`✓ Payment request created for ${amount} USDC`]

        steps[5].status = 'completed'
        steps[5].details = ['✓ Payment sent via ACK-Pay']

        steps[6].status = 'completed'
        steps[6].details = [`✓ Payment receipt verified`]

        steps[7].status = 'completed'
        const ethAmount = amount / 3000
        steps[7].details = [
          `✓ Swap executed: ${amount} USDC → ${ethAmount.toFixed(4)} ETH`,
          `✓ Transaction completed`
        ]

        setFlowSteps([...steps])
        setCurrentStep(7)

        // Update balances
        setRequestorState(prev => ({
          ...prev,
          balance: {
            usdc: Math.max(0, prev.balance.usdc - amount),
            eth: prev.balance.eth + ethAmount
          }
        }))

        setExecutorState(prev => ({
          ...prev,
          balance: {
            usdc: prev.balance.usdc + amount,
            eth: Math.max(0, prev.balance.eth - ethAmount)
          }
        }))

      } else if (responseText.includes('processing') || responseText.includes('checking') || responseText.includes('help')) {
        // Agent is processing or asking for clarification
        steps[1].status = 'in-progress'
        steps[1].details = ['Processing request...']
        setFlowSteps([...steps])
        setCurrentStep(1)

      } else {
        // Default case - show as processing
        steps[1].status = 'in-progress'
        steps[1].details = ['Agent is processing your request...']
        setFlowSteps([...steps])
        setCurrentStep(1)
      }

      // Refresh balances from ACK-Lab after any swap attempt
      setTimeout(async () => {
        try {
          const balanceResponse = await fetch('http://localhost:5680/agents')
          if (balanceResponse.ok) {
            const agents = await balanceResponse.json()
            // Update agent states with fresh data if available
            agents.forEach((agent: { did: string }) => {
              if (agent.did.includes('alice') || agent.did.includes('5678')) {
                // This is the requestor - we'd need to fetch actual balance from ACK-Lab
                // For now, keep the calculated balance
              }
            })
          }
        } catch (error) {
          console.log('Could not refresh balances:', error)
        }
      }, 1000)

    } catch (error) {
      console.error('Failed to execute swap:', error)
      setChatHistory(prev => [...prev, {
        role: 'agent',
        message: `❌ Failed to process swap: ${error}`,
        timestamp: new Date()
      }])

      // Mark first step as failed
      steps[1].status = 'failed'
      steps[1].details = [`❌ Communication error: ${error}`]
      setFlowSteps([...steps])
    }

    setIsProcessing(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (userInput.trim() && !isProcessing) {
      executeRealSwap(userInput)
      setUserInput('')
    }
  }

  const resetFlow = () => {
    setCurrentStep(0)
    setChatHistory([])
    setRequestorState({
      did: 'did:web:alice.example.com',
      balance: { usdc: 100, eth: 0 },
      status: 'idle'
    })
    setExecutorState({
      did: 'did:web:bob.example.com',
      balance: { usdc: 0, eth: 0.5 },
      status: 'idle'
    })
    const resetSteps = flowSteps.map((step, index) => ({
      ...step,
      status: index === 0 ? 'completed' as const : 'pending' as const,
      details: index === 0 ? step.details : undefined
    }))
    setFlowSteps(resetSteps)
  }

  const resetBalances = async () => {
    if (isProcessing) return

    setIsProcessing(true)
    setChatHistory(prev => [...prev, { role: 'user', message: 'reset', timestamp: new Date() }])

    try {
      const response = await fetch('http://localhost:5680/reset-balances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (response.ok) {
        const result = await response.json()
        setChatHistory(prev => [...prev, {
          role: 'agent',
          message: `✅ ${result.message}. Requestor: 100 USDC, 0 ETH | Executor: 0 USDC, 0.5 ETH`,
          timestamp: new Date()
        }])

        // Update UI state
        setRequestorState(prev => ({ ...prev, balance: { usdc: 100, eth: 0 } }))
        setExecutorState(prev => ({ ...prev, balance: { usdc: 0, eth: 0.5 } }))

        // Reset flow steps
        resetFlow()
      } else {
        setChatHistory(prev => [...prev, {
          role: 'agent',
          message: '❌ Failed to reset balances',
          timestamp: new Date()
        }])
      }
    } catch (error) {
      setChatHistory(prev => [...prev, {
        role: 'agent',
        message: `❌ Error resetting balances: ${error}`,
        timestamp: new Date()
      }])
    }

    setIsProcessing(false)
  }

  const topupRequestor = async () => {
    if (isProcessing) return

    setIsProcessing(true)
    setChatHistory(prev => [...prev, { role: 'user', message: 'topup', timestamp: new Date() }])

    try {
      const response = await fetch('http://localhost:5680/topup-requestor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 100 })
      })

      if (response.ok) {
        const result = await response.json()
        setChatHistory(prev => [...prev, {
          role: 'agent',
          message: `✅ ${result.message}`,
          timestamp: new Date()
        }])

        // Update requestor balance
        setRequestorState(prev => ({
          ...prev,
          balance: { ...prev.balance, usdc: prev.balance.usdc + 100 }
        }))
      } else {
        setChatHistory(prev => [...prev, {
          role: 'agent',
          message: '❌ Failed to topup requestor',
          timestamp: new Date()
        }])
      }
    } catch (error) {
      setChatHistory(prev => [...prev, {
        role: 'agent',
        message: `❌ Error topping up: ${error}`,
        timestamp: new Date()
      }])
    }

    setIsProcessing(false)
  }

  const progress = ((flowSteps.filter(step => step.status === 'completed').length) / flowSteps.length) * 100

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">ACK Swap Demo - Web UI</h1>
        <p className="text-muted-foreground">
          Interactive visualization of AI agents conducting token swaps using ACK-ID and ACK-Pay
        </p>
      </div>

      {/* Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5" />
            Swap Progress
          </CardTitle>
          <CardDescription>Overall flow completion</CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={progress} className="w-full" />
          <p className="text-sm text-muted-foreground mt-2">
            {flowSteps.filter(step => step.status === 'completed').length} of {flowSteps.length} steps completed
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent States */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-blue-500" />
                Requestor (Alice)
              </CardTitle>
              <CardDescription className="font-mono text-xs">
                {requestorState.did}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span>USDC:</span>
                <span className="font-mono">{requestorState.balance.usdc}</span>
              </div>
              <div className="flex justify-between">
                <span>ETH:</span>
                <span className="font-mono">{requestorState.balance.eth.toFixed(4)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-green-500" />
                Executor (Bob)
              </CardTitle>
              <CardDescription className="font-mono text-xs">
                {executorState.did}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span>USDC:</span>
                <span className="font-mono">{executorState.balance.usdc}</span>
              </div>
              <div className="flex justify-between">
                <span>ETH:</span>
                <span className="font-mono">{executorState.balance.eth.toFixed(4)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Flow Steps */}
        <Card>
          <CardHeader>
            <CardTitle>Flow Steps</CardTitle>
            <CardDescription>Step-by-step swap process</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {flowSteps.map((step, index) => (
              <div
                key={step.id}
                className={`p-3 rounded-lg border ${
                  index === currentStep ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  {getStatusIcon(step.status)}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm">{step.title}</h4>
                      <Badge variant="secondary" className={`text-xs ${getAgentColor(step.agent)}`}>
                        {getAgentIcon(step.agent)}
                        <span className="ml-1 capitalize">{step.agent}</span>
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                    {step.details && (
                      <ul className="text-xs space-y-1 mt-2">
                        {step.details.map((detail, i) => (
                          <li key={i} className="text-muted-foreground">{detail}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Chat Interface */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Chat with Requestor Agent</CardTitle>
              <CardDescription>Send natural language swap requests</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-48 border rounded-lg p-3 overflow-y-auto bg-gray-50">
                {chatHistory.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    Try: &quot;Can you swap 60 USDC for ETH?&quot;
                  </p>
                ) : (
                  <div className="space-y-2">
                    {chatHistory.map((msg, index) => (
                      <div
                        key={index}
                        className={`p-2 rounded text-sm ${
                          msg.role === 'user'
                            ? 'bg-blue-100 text-blue-900 ml-8'
                            : 'bg-white text-gray-900 mr-8'
                        }`}
                      >
                        <div className="font-medium text-xs mb-1">
                          {msg.role === 'user' ? 'You' : 'Agent'}
                        </div>
                        {msg.message}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-2">
                <Input
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="Enter your swap request..."
                  disabled={isProcessing}
                />
                                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={isProcessing || !userInput.trim()}
                    className="flex-1"
                  >
                    {isProcessing ? 'Processing...' : 'Send'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetFlow}
                    disabled={isProcessing}
                  >
                    Reset Flow
                  </Button>
                </div>
                <div className="flex gap-2 mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetBalances}
                    disabled={isProcessing}
                    className="flex-1"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset Balances
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={topupRequestor}
                    disabled={isProcessing}
                    className="flex-1"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Topup +$100
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
