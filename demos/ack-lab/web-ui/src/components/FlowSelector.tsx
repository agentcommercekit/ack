'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import {
  ArrowLeftRight,
  Database,
  Coins,
  Bot,
  User,
  Shield
} from 'lucide-react'
import { SwapFlow } from './SwapFlow'
import { DataFlow } from './DataFlow'

export function FlowSelector() {
  const [activeFlow, setActiveFlow] = useState<'swap' | 'data'>('data')

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">ACK E2E Demos</h1>
        <p className="text-muted-foreground text-lg">
          Interactive demonstrations of AI agents conducting commerce using ACK-ID and ACK-Pay
        </p>

        {/* Flow Selector */}
        <div className="flex justify-center">
          <Tabs value={activeFlow} onValueChange={(value) => setActiveFlow(value as 'swap' | 'data')} className="w-full max-w-md">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="swap" className="flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4" />
                Token Swap
              </TabsTrigger>
              <TabsTrigger value="data" className="flex items-center gap-2">
                <Database className="w-4 h-4" />
                Data Monetization
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Flow Description Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
          <Card className={`transition-all ${activeFlow === 'swap' ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-blue-500" />
                Token Swap Demo
              </CardTitle>
              <CardDescription>
                AI agents negotiate and execute token swaps with identity verification and payment processing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-blue-500" />
                <span>Requestor Agent (Alice)</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Bot className="w-4 h-4 text-green-500" />
                <span>Executor Agent (Bob)</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Shield className="w-4 h-4 text-purple-500" />
                <span>ACK-Lab Service</span>
              </div>
              <div className="mt-3">
                <Badge variant="secondary" className="text-xs">
                  USDC ↔ ETH Trading
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className={`transition-all ${activeFlow === 'data' ? 'ring-2 ring-green-500 bg-green-50' : ''}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-green-500" />
                Data Monetization Demo
              </CardTitle>
              <CardDescription>
                AI agents discover, negotiate, and purchase access to datasets with real-time pricing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-blue-500" />
                <span>Requestor Agent (DataCorp)</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Database className="w-4 h-4 text-green-500" />
                <span>Provider Agent (AnalyticsInc)</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Shield className="w-4 h-4 text-purple-500" />
                <span>ACK-Lab Service</span>
              </div>
              <div className="mt-3">
                <Badge variant="secondary" className="text-xs">
                  Dataset Access Trading
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Flow Content */}
      <div className="mt-8">
        {activeFlow === 'swap' ? <SwapFlow /> : <DataFlow />}
      </div>
    </div>
  )
}
