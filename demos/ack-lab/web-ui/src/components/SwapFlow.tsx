'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Progress } from './ui/progress'
import { Input } from './ui/input'
import {
  CheckCircle,
  Clock,
  AlertCircle,
  User,
  Bot,
  Coins,
  Shield,
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

  // Handle real-time events from the agent
  const handleRealtimeEvent = useCallback((eventData: {
    type: string
    step: string
    message: string
    data?: {
      amountIn?: number
      tokenIn?: string
      tokenOut?: string
      usdcAmount?: number
      ethAmount?: string
      required?: number
      executorDid?: string
      paymentToken?: string
      receipt?: string
      executorMessage?: string
      amountSwapped?: string
      amountReceived?: string
      transactionHash?: string
    }
    error?: string
  }) => {
    console.log(`🔄 Processing ${eventData.type} event for swap step: ${eventData.step}`, eventData)

    const steps = [...flowSteps]

    // Map event steps to our flow steps
    const stepMapping: { [key: string]: number } = {
      'balance-check': 1,
      'identity-verification': 3,
      'swap-initiation': 2,
      'payment-request': 4,
      'payment-processing': 5,
      'payment-verification': 6,
      'swap-execution': 7
    }

    const stepIndex = stepMapping[eventData.step]
    if (!stepIndex) return

    switch (eventData.type) {
      case 'step_started':
        // Mark previous steps as completed
        for (let i = 1; i < stepIndex; i++) {
          if (steps[i].status !== 'completed') {
            steps[i].status = 'completed'
          }
        }
        // Mark current step as in-progress
        steps[stepIndex].status = 'in-progress'
        steps[stepIndex].details = [eventData.message]
        if (eventData.data) {
          // Add real data details
          if (eventData.data.amountIn) {
            steps[stepIndex].details.push(`💰 Amount: ${eventData.data.amountIn} USDC`)
          }
          if (eventData.data.usdcAmount !== undefined) {
            steps[stepIndex].details.push(`💵 Balance: ${eventData.data.usdcAmount} USDC`)
          }
        }
        setCurrentStep(stepIndex)
        break

      case 'step_completed':
        steps[stepIndex].status = 'completed'
        steps[stepIndex].details = [`✅ ${eventData.message}`]

        // Add real data details
        if (eventData.data) {
          if (eventData.data.usdcAmount !== undefined) {
            steps[stepIndex].details.push(`💵 Balance: ${eventData.data.usdcAmount} USDC`)
          }
          if (eventData.data.ethAmount) {
            steps[stepIndex].details.push(`⟠ ETH: ${eventData.data.ethAmount}`)
          }
          if (eventData.data.paymentToken) {
            steps[stepIndex].details.push(`🎫 Payment Token: ${eventData.data.paymentToken}`)
          }
          if (eventData.data.receipt) {
            steps[stepIndex].details.push(`📄 Receipt: ${eventData.data.receipt}`)
          }
          if (eventData.data.amountSwapped) {
            steps[stepIndex].details.push(`💱 Swapped: ${eventData.data.amountSwapped} USDC`)
          }
          if (eventData.data.amountReceived) {
            steps[stepIndex].details.push(`💰 Received: ${eventData.data.amountReceived} ETH`)
          }
          if (eventData.data.transactionHash) {
            steps[stepIndex].details.push(`🔗 Tx Hash: ${eventData.data.transactionHash.substring(0, 10)}...`)
          }
          if (eventData.data.executorMessage && !eventData.data.transactionHash) {
            // Only show full message if we don't have parsed details
            steps[stepIndex].details.push(`✅ ${eventData.data.executorMessage.substring(0, 100)}...`)
          }
        }
        setCurrentStep(stepIndex)
        break

      case 'step_failed':
        steps[stepIndex].status = 'failed'
        steps[stepIndex].details = [`❌ ${eventData.message}`]
        if (eventData.data?.usdcAmount !== undefined && eventData.data?.required) {
          steps[stepIndex].details.push(`💵 Have: ${eventData.data.usdcAmount} USDC`)
          steps[stepIndex].details.push(`💰 Need: ${eventData.data.required} USDC`)
        }
        setCurrentStep(stepIndex)
        break
    }

    setFlowSteps([...steps])
  }, [flowSteps, setCurrentStep, setFlowSteps])

  // Connect to SSE events when component mounts
  useEffect(() => {
    const connectToEvents = () => {
      console.log('🔌 Connecting to SSE events for swap...')
      const es = new EventSource('http://localhost:5678/events')

      es.onopen = () => {
        console.log('✅ SSE connection opened for swap')
      }

      es.onmessage = (event) => {
        try {
          console.log('📡 Raw SSE message (swap):', event.data)
          const eventData = JSON.parse(event.data)
          console.log('📡 Parsed SSE event (swap):', eventData)

          // Skip connection events
          if (eventData.type === 'connected') {
            console.log('✅ SSE connection confirmed for swap')
            return
          }

          handleRealtimeEvent(eventData)
        } catch (error) {
          console.error('❌ Error parsing SSE event (swap):', error, 'Raw data:', event.data)
        }
      }

      es.onerror = (error) => {
        console.error('❌ SSE connection error (swap):', error)
        // Attempt to reconnect after a delay
        setTimeout(() => {
          console.log('🔄 Attempting to reconnect SSE for swap...')
          connectToEvents()
        }, 3000)
      }

      return es
    }

    const es = connectToEvents()

    // Cleanup on unmount
    return () => {
      console.log('🔌 Closing SSE connection for swap')
      es.close()
    }
  }, [handleRealtimeEvent])

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
      console.log('🚀 Starting swap request:', message)

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

      const responseText = result.text || ''
      console.log('📨 Agent final response:', responseText)

      // Add the agent's response to chat
      setChatHistory(prev => [...prev, {
        role: 'agent',
        message: responseText,
        timestamp: new Date()
      }])

      // Real-time events via SSE will handle all step updates
      console.log('✅ Swap request initiated, SSE events will handle progress updates')

      // Extract amount for balance updates
      const amountMatch = message.match(/(\d+(?:\.\d+)?)\s*(usdc|eth)/i)
      const amount = amountMatch ? parseFloat(amountMatch[1]) : 60

      // Update balances if swap completed successfully
      if (responseText.includes('successfully') || responseText.includes('completed') || responseText.includes('Transaction:')) {
        const ethAmount = amount / 3000

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
      }

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
    <div className="space-y-6">

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
