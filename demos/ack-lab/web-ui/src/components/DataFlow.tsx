'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Progress } from './ui/progress'
import { Separator } from './ui/separator'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import {
  ArrowRight,
  CheckCircle,
  Clock,
  AlertCircle,
  User,
  Bot,
  Database,
  Shield,
  CreditCard,
  RefreshCw,
  RotateCcw,
  Plus,
  DollarSign,
  FileText,
  Key,
  Download,
  MessageSquare
} from 'lucide-react'

interface FlowStep {
  id: string
  title: string
  description: string
  status: 'pending' | 'in-progress' | 'completed' | 'failed'
  agent: 'requestor' | 'provider' | 'ack-lab'
  details?: string[]
}

interface AgentState {
  did: string
  balance: {
    usdc: number
  }
  status: 'idle' | 'processing' | 'waiting'
}

interface Dataset {
  id: string
  name: string
  description: string
  size: string
  updateFrequency: string
  priceRange: string
}

interface NegotiationState {
  negotiationId?: string
  datasetId?: string
  currentPrice?: number
  agreedPrice?: number
  paymentToken?: string
  accessToken?: string
  dataUrl?: string
  rounds: number
}

const availableDatasets: Dataset[] = [
  {
    id: 'financial-markets-2024',
    name: 'Financial Markets Data 2024',
    description: 'Real-time and historical market data including stocks, bonds, and derivatives',
    size: '500GB',
    updateFrequency: 'real-time',
    priceRange: '$10-100/hour'
  },
  {
    id: 'consumer-behavior-q4',
    name: 'Consumer Behavior Analytics Q4',
    description: 'Aggregated consumer purchasing patterns and preferences',
    size: '250GB',
    updateFrequency: 'daily',
    priceRange: '$10-100/hour'
  },
  {
    id: 'supply-chain-insights',
    name: 'Global Supply Chain Insights',
    description: 'Supply chain performance metrics and predictive analytics',
    size: '100GB',
    updateFrequency: 'weekly',
    priceRange: '$10-100/hour'
  }
]

export function DataFlow() {
  const [currentStep, setCurrentStep] = useState(0)
  const [userInput, setUserInput] = useState('')
  const [chatHistory, setChatHistory] = useState<Array<{role: 'user' | 'requestor' | 'provider', message: string, timestamp: Date}>>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedDataset, setSelectedDataset] = useState<string>('')
  const [negotiationState, setNegotiationState] = useState<NegotiationState>({ rounds: 0 })
  const [eventSource, setEventSource] = useState<EventSource | null>(null)

  const [requestorState, setRequestorState] = useState<AgentState>({
    did: 'did:web:localhost%3A5678',
    balance: { usdc: 1000 },
    status: 'idle'
  })

  const [providerState, setProviderState] = useState<AgentState>({
    did: 'did:web:localhost%3A5681',
    balance: { usdc: 0 },
    status: 'idle'
  })

  const [flowSteps, setFlowSteps] = useState<FlowStep[]>([
    {
      id: 'identity-setup',
      title: 'Identity & Service Setup',
      description: 'Agent identities, Catena ICC credentials, and ACK-Lab service',
      status: 'completed',
      agent: 'ack-lab',
      details: [
        '✓ Created DataCorp (Requestor) identity',
        '✓ Created AnalyticsInc (Provider) identity',
        '✓ Issued Catena ICC credentials',
        '✓ Started ACK-Lab service on port 5680',
        '✓ Provider agent running on port 5681',
        '✓ Requestor agent running on port 5678'
      ]
    },
    {
      id: 'dataset-discovery',
      title: 'Dataset Discovery',
      description: 'Browse and select available datasets from provider',
      status: 'pending',
      agent: 'requestor'
    },
    {
      id: 'credential-verification',
      title: 'Credential Verification',
      description: 'Provider verifies requestor has Catena ICC credentials',
      status: 'pending',
      agent: 'provider'
    },
    {
      id: 'price-negotiation',
      title: 'Price Negotiation',
      description: 'Multi-round negotiation between requestor and provider',
      status: 'pending',
      agent: 'requestor'
    },
    {
      id: 'payment-request',
      title: 'Payment Request Creation',
      description: 'Provider creates payment request after price agreement',
      status: 'pending',
      agent: 'provider'
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
      description: 'Provider verifies payment receipt',
      status: 'pending',
      agent: 'provider'
    },
    {
      id: 'data-access',
      title: 'Data Access Grant',
      description: 'Provider grants time-limited access to dataset',
      status: 'pending',
      agent: 'provider'
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
      case 'provider':
        return <Database className="w-4 h-4" />
      case 'ack-lab':
        return <Shield className="w-4 h-4" />
    }
  }

  const getAgentColor = (agent: FlowStep['agent']) => {
    switch (agent) {
      case 'requestor':
        return 'bg-blue-100 text-blue-800'
      case 'provider':
        return 'bg-green-100 text-green-800'
      case 'ack-lab':
        return 'bg-purple-100 text-purple-800'
    }
  }

    // Connect to SSE events when component mounts
  useEffect(() => {
    let es: EventSource | null = null
    let reconnectTimeout: NodeJS.Timeout | null = null
    let isCleaningUp = false

    const connectToEvents = () => {
      if (isCleaningUp) return // Don't reconnect if we're cleaning up

      console.log('🔌 Connecting to SSE events...')

      // Close existing connection if any
      if (es) {
        es.close()
      }

      es = new EventSource('http://localhost:5677/events')

      es.onopen = () => {
        console.log('✅ SSE connection opened')
      }

      es.onmessage = (event) => {
        try {
          console.log('📡 Raw SSE message:', event.data)
          const eventData = JSON.parse(event.data)
          console.log('📡 Parsed SSE event:', eventData)

          // Skip connection events
          if (eventData.type === 'connected') {
            console.log('✅ SSE connection confirmed')
            return
          }

          handleRealtimeEvent(eventData)
        } catch (error) {
          console.error('❌ Error parsing SSE event:', error, 'Raw data:', event.data)
        }
      }

      es.onerror = (error) => {
        console.error('❌ SSE connection error:', error)

        if (es) {
          es.close()
        }

        // Only reconnect if we're not cleaning up
        if (!isCleaningUp) {
          // Clear any existing timeout
          if (reconnectTimeout) {
            clearTimeout(reconnectTimeout)
          }

          // Reconnect after a delay with exponential backoff
          reconnectTimeout = setTimeout(() => {
            console.log('🔄 Attempting to reconnect SSE...')
            connectToEvents()
          }, 5000) // Increased delay to 5 seconds
        }
      }

      setEventSource(es)
    }

    connectToEvents()

    // Cleanup on unmount
    return () => {
      console.log('🔌 Closing SSE connection')
      isCleaningUp = true

      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
      }

      if (es) {
        es.close()
      }

      if (eventSource) {
        eventSource.close()
      }
    }
  }, []) // Empty dependency array is correct here

  // Handle real-time events from the agent
  const handleRealtimeEvent = useCallback((eventData: any) => {
    console.log(`🔄 Processing ${eventData.type} event for step: ${eventData.step}`, eventData)

    const steps = [...flowSteps]

    // Map event steps to our flow steps
    const stepMapping: { [key: string]: number } = {
      'dataset-discovery': 1,
      'credential-verification': 2,
      'price-negotiation': 3,
      'payment-request': 4,
      'payment-processing': 5,
      'payment-verification': 6,
      'data-access': 7
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
        setCurrentStep(stepIndex)
        break

      case 'step_progress':
        steps[stepIndex].status = 'in-progress'
        steps[stepIndex].details = [eventData.message]
        if (eventData.data) {
          // Add real data details
          if (eventData.data.offerPrice) {
            steps[stepIndex].details.push(`💰 Offer: $${eventData.data.offerPrice}`)
          }
          if (eventData.data.round) {
            steps[stepIndex].details.push(`🔄 Round: ${eventData.data.round}`)
          }
          if (eventData.data.negotiationId) {
            steps[stepIndex].details.push(`🆔 ID: ${eventData.data.negotiationId}`)
            setNegotiationState(prev => ({ ...prev, negotiationId: eventData.data.negotiationId }))
          }
        }
        break

      case 'step_completed':
        // Mark previous steps as completed
        for (let i = 1; i <= stepIndex; i++) {
          steps[i].status = 'completed'
        }
        steps[stepIndex].details = [`✅ ${eventData.message}`]

        // Add real data details
        if (eventData.data) {
          if (eventData.data.agreedPrice) {
            steps[stepIndex].details.push(`💰 Agreed Price: $${eventData.data.agreedPrice}`)
            setNegotiationState(prev => ({ ...prev, agreedPrice: eventData.data.agreedPrice }))
          }
          if (eventData.data.paymentToken) {
            steps[stepIndex].details.push(`🎫 Payment Token: ${eventData.data.paymentToken.substring(0, 20)}...`)
          }
          if (eventData.data.accessToken) {
            steps[stepIndex].details.push(`🔑 Access Token: ${eventData.data.accessToken}`)
            setNegotiationState(prev => ({ ...prev, accessToken: eventData.data.accessToken }))
          }
          if (eventData.data.dataUrl) {
            steps[stepIndex].details.push(`🔗 Data URL: ${eventData.data.dataUrl}`)
            setNegotiationState(prev => ({ ...prev, dataUrl: eventData.data.dataUrl }))
          }
          if (eventData.data.recordCount) {
            steps[stepIndex].details.push(`📊 Records: ${eventData.data.recordCount}`)
          }
        }
        setCurrentStep(stepIndex)
        break

      case 'step_failed':
        steps[stepIndex].status = 'failed'
        steps[stepIndex].details = [`❌ ${eventData.message}`]
        setCurrentStep(stepIndex)
        break
    }

    setFlowSteps([...steps])
  }, [flowSteps, setCurrentStep, setFlowSteps, setNegotiationState])

  const executeDataRequest = async (message: string) => {
    setIsProcessing(true)
    setChatHistory(prev => [...prev, { role: 'user', message, timestamp: new Date() }])

    // Reset steps except setup
    const steps = [...flowSteps]
    for (let i = 1; i < steps.length; i++) {
      steps[i].status = 'pending'
      steps[i].details = undefined
    }
    setFlowSteps([...steps])
    setCurrentStep(1)

    try {
      console.log('🚀 Starting data request:', message)

      // Send request to requestor agent through the router
      const response = await fetch('http://localhost:5677/chat', {
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

      // Add requestor's response to chat
      setChatHistory(prev => [...prev, {
        role: 'requestor',
        message: responseText,
        timestamp: new Date()
      }])

      // Real-time events via SSE will handle all step updates
      console.log('✅ Data request initiated, SSE events will handle progress updates')

      // Extract final balance updates if available
      const balanceMatch = responseText.match(/(\d+(?:\.\d+)?)\s*USDC/g)
      if (balanceMatch && balanceMatch.length > 0) {
        const paidAmount = parseFloat(balanceMatch[0].replace(' USDC', ''))
        setRequestorState(prev => ({
          ...prev,
          balance: { usdc: Math.max(0, prev.balance.usdc - paidAmount) }
        }))
        setProviderState(prev => ({
          ...prev,
          balance: { usdc: prev.balance.usdc + paidAmount }
        }))
      }

    } catch (error) {
      console.error('Failed to execute data request:', error)
      setChatHistory(prev => [...prev, {
        role: 'requestor',
        message: `❌ Failed to process request: ${error}`,
        timestamp: new Date()
      }])

      const steps = [...flowSteps]
      steps[1].status = 'failed'
      steps[1].details = [`❌ Communication error: ${error}`]
      setFlowSteps([...steps])
    }

    setIsProcessing(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (userInput.trim() && !isProcessing) {
      executeDataRequest(userInput)
      setUserInput('')
    }
  }

  const handleDatasetSelect = (datasetId: string) => {
    setSelectedDataset(datasetId)
    const dataset = availableDatasets.find(d => d.id === datasetId)
    if (dataset) {
      const request = `I need access to the ${datasetId} dataset for 10 hours. Purpose: Data analysis and insights.`
      setUserInput(request)
    }
  }

  const resetFlow = () => {
    setCurrentStep(0)
    setChatHistory([])
    setSelectedDataset('')
    setNegotiationState({ rounds: 0 })
    setRequestorState({
      did: 'did:web:localhost%3A5678',
      balance: { usdc: 1000 },
      status: 'idle'
    })
    setProviderState({
      did: 'did:web:localhost%3A5681',
      balance: { usdc: 0 },
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
    setChatHistory(prev => [...prev, { role: 'user', message: 'reset balances', timestamp: new Date() }])

    try {
      const response = await fetch('http://localhost:5680/reset-balances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (response.ok) {
        const result = await response.json()
        setChatHistory(prev => [...prev, {
          role: 'requestor',
          message: `✅ ${result.message}. Requestor: 1,000 USDC | Provider: 0 USDC`,
          timestamp: new Date()
        }])

        setRequestorState(prev => ({ ...prev, balance: { usdc: 1000 } }))
        setProviderState(prev => ({ ...prev, balance: { usdc: 0 } }))
        resetFlow()
      } else {
        setChatHistory(prev => [...prev, {
          role: 'requestor',
          message: '❌ Failed to reset balances',
          timestamp: new Date()
        }])
      }
    } catch (error) {
      setChatHistory(prev => [...prev, {
        role: 'requestor',
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
          role: 'requestor',
          message: `✅ ${result.message}`,
          timestamp: new Date()
        }])

        // Update requestor balance
        setRequestorState(prev => ({
          ...prev,
          balance: { usdc: prev.balance.usdc + 100 }
        }))
      } else {
        setChatHistory(prev => [...prev, {
          role: 'requestor',
          message: '❌ Failed to topup requestor',
          timestamp: new Date()
        }])
      }
    } catch (error) {
      setChatHistory(prev => [...prev, {
        role: 'requestor',
        message: `❌ Error topping up: ${error}`,
        timestamp: new Date()
      }])
    }

    setIsProcessing(false)
  }

  const retrieveData = async () => {
    if (!negotiationState.dataUrl || !negotiationState.accessToken) return

    setIsProcessing(true)
    setChatHistory(prev => [...prev, { role: 'user', message: 'retrieve data', timestamp: new Date() }])

    try {
      const response = await fetch(negotiationState.dataUrl, {
        headers: {
          'Authorization': `Bearer ${negotiationState.accessToken}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setChatHistory(prev => [...prev, {
          role: 'provider',
          message: `✅ Data retrieved successfully!\nDataset: ${data.datasetId}\nRecords: ${data.data?.records || 'N/A'}\nFormat: ${data.data?.format || 'JSON'}`,
          timestamp: new Date()
        }])
      } else {
        setChatHistory(prev => [...prev, {
          role: 'provider',
          message: `❌ Failed to retrieve data: ${response.status}`,
          timestamp: new Date()
        }])
      }
    } catch (error) {
      setChatHistory(prev => [...prev, {
        role: 'provider',
        message: `❌ Error retrieving data: ${error}`,
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
            <Database className="w-5 h-5" />
            Data Transaction Progress
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
                Requestor (DataCorp)
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
              <div className="text-xs text-muted-foreground">
                Port: 5678 | Status: {requestorState.status}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-green-500" />
                Provider (AnalyticsInc)
              </CardTitle>
              <CardDescription className="font-mono text-xs">
                {providerState.did}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span>USDC:</span>
                <span className="font-mono">{providerState.balance.usdc}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Port: 5681 | Status: {providerState.status}
              </div>
            </CardContent>
          </Card>

          {/* Negotiation State */}
          {(negotiationState.negotiationId || negotiationState.accessToken) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-orange-500" />
                  Transaction Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {negotiationState.negotiationId && (
                  <div>
                    <span className="font-medium">Negotiation ID:</span>
                    <div className="font-mono text-xs text-muted-foreground break-all">
                      {negotiationState.negotiationId}
                    </div>
                  </div>
                )}
                {negotiationState.agreedPrice && (
                  <div className="flex justify-between">
                    <span>Agreed Price:</span>
                    <span className="font-mono">${negotiationState.agreedPrice}</span>
                  </div>
                )}
                {negotiationState.accessToken && (
                  <div>
                    <span className="font-medium">Access Token:</span>
                    <div className="font-mono text-xs text-muted-foreground break-all">
                      {negotiationState.accessToken}
                    </div>
                  </div>
                )}
                {negotiationState.dataUrl && (
                  <div className="mt-2">
                    <Button
                      onClick={retrieveData}
                      disabled={isProcessing}
                      size="sm"
                      className="w-full"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Retrieve Data
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Flow Steps */}
        <Card>
          <CardHeader>
            <CardTitle>Flow Steps</CardTitle>
            <CardDescription>Step-by-step data transaction process</CardDescription>
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

        {/* Interface */}
        <div className="space-y-4">
          <Tabs defaultValue="chat" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="datasets">Datasets</TabsTrigger>
              <TabsTrigger value="chat">Chat</TabsTrigger>
            </TabsList>

            <TabsContent value="datasets" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Available Datasets</CardTitle>
                  <CardDescription>Select a dataset to request access</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {availableDatasets.map((dataset) => (
                    <div
                      key={dataset.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedDataset === dataset.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleDatasetSelect(dataset.id)}
                    >
                      <h4 className="font-medium text-sm">{dataset.name}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{dataset.description}</p>
                      <div className="flex justify-between text-xs text-muted-foreground mt-2">
                        <span>{dataset.size}</span>
                        <span>{dataset.updateFrequency}</span>
                        <span>{dataset.priceRange}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="chat" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Chat with Requestor Agent</CardTitle>
                  <CardDescription>Send natural language data requests</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="h-64 border rounded-lg p-3 overflow-y-auto bg-gray-50">
                    {chatHistory.length === 0 ? (
                      <div className="space-y-2 text-muted-foreground text-sm">
                        <p>Try these example requests:</p>
                        <ul className="space-y-1 text-xs">
                          <li>• "I need the financial-markets-2024 dataset for 10 hours"</li>
                          <li>• "Get me consumer behavior data for analysis"</li>
                          <li>• "Can you acquire supply chain insights for 24 hours?"</li>
                        </ul>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {chatHistory.map((msg, index) => (
                          <div
                            key={index}
                            className={`p-3 rounded-lg text-sm ${
                              msg.role === 'user'
                                ? 'bg-blue-100 text-blue-900 ml-6'
                                : msg.role === 'requestor'
                                ? 'bg-white text-gray-900 mr-6 border-l-4 border-blue-500'
                                : 'bg-green-50 text-green-900 mr-6 border-l-4 border-green-500'
                            }`}
                          >
                            <div className="font-medium text-xs mb-1 flex items-center gap-2">
                              {msg.role === 'user' && <User className="w-3 h-3" />}
                              {msg.role === 'requestor' && <User className="w-3 h-3 text-blue-500" />}
                              {msg.role === 'provider' && <Database className="w-3 h-3 text-green-500" />}
                              {msg.role === 'user' ? 'You' : msg.role === 'requestor' ? 'Requestor Agent' : 'Provider Agent'}
                            </div>
                            <div className="whitespace-pre-wrap">{msg.message}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-2">
                    <Textarea
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      placeholder="Enter your data request..."
                      disabled={isProcessing}
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button
                        type="submit"
                        disabled={isProcessing || !userInput.trim()}
                        className="flex-1"
                      >
                        {isProcessing ? 'Processing...' : 'Send Request'}
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
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
