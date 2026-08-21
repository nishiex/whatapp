

"use client"

import React, { useState, useEffect } from "react"
import { useCRM } from "@/contexts/crm-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"

// Simple date input component
const DateInput = ({ value, onChange, label, required }) => {
  const formatDateForInput = (date) => {
    if (!date) return ""
    try {
      const d = date instanceof Date ? date : new Date(date)
      if (isNaN(d.getTime())) return ""
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    } catch (error) {
      return ""
    }
  }

  const handleChange = (e) => {
    const dateString = e.target.value
    if (dateString) {
      const date = new Date(dateString + 'T00:00:00')
      onChange(date)
    } else {
      onChange(undefined)
    }
  }

  return (
    <div className="space-y-2">
      <Label>{label} {required && '*'}</Label>
      <Input
        type="date"
        value={formatDateForInput(value)}
        onChange={handleChange}
        required={required}
        min={new Date().toISOString().split('T')[0]}
        className="w-full"
      />
    </div>
  )
}

export function DealDialog({ open, onOpenChange, deal, mode }) {
  const { addDeal, updateDeal, customers } = useCRM()
  
  const DEFAULT_FORM = {
    title: "",
    customerId: "",
    value: "0",
    stage: "prospecting",
    probability: "50",
    assignedTo: "",
    notes: "",
  }

  const [formData, setFormData] = useState(DEFAULT_FORM)
  const [expectedCloseDate, setExpectedCloseDate] = useState(undefined)
  const [products, setProducts] = useState([])
  const [newProduct, setNewProduct] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (open) {
      if (deal && mode === "edit") {
        setFormData({
          title: deal.title ?? "",
          customerId: deal.customerId ?? "",
          value: typeof deal.value === "number" ? String(deal.value) : String(deal.value ?? "0"),
          stage: deal.stage ?? "prospecting",
          probability: typeof deal.probability === "number" ? String(deal.probability) : String(deal.probability ?? "50"),
          assignedTo: deal.assignedTo ?? "user1",
          notes: deal.notes ?? "",
        })
        
        // Handle date conversion
        let dateValue = undefined
        if (deal.expectedCloseDate) {
          if (deal.expectedCloseDate instanceof Date) {
            dateValue = deal.expectedCloseDate
          } else {
            const parsed = new Date(deal.expectedCloseDate)
            if (!isNaN(parsed.getTime())) {
              dateValue = parsed
            }
          }
        }
        setExpectedCloseDate(dateValue)
        setProducts(Array.isArray(deal.products) ? deal.products : [])
      } else {
        setFormData(DEFAULT_FORM)
        setExpectedCloseDate(undefined)
        setProducts([])
      }
      setNewProduct("")
      setError(null)
    }
  }, [deal, mode, open])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    const title = formData.title.trim()
    const customerId = formData.customerId
    
    if (!title) {
      setError("Title is required.")
      return
    }
    
    if (!customerId) {
      setError("Customer is required.")
      return
    }

    if (!expectedCloseDate) {
      setError("Please select an expected close date.")
      return
    }

    const valueNumber = formData.value ? Number(formData.value) : 0
    if (isNaN(valueNumber) || valueNumber < 0) {
      setError("Deal value must be a valid non-negative number.")
      return
    }

    const probabilityNumber = formData.probability ? Number(formData.probability) : 0
    if (isNaN(probabilityNumber) || probabilityNumber < 0 || probabilityNumber > 100) {
      setError("Probability must be between 0 and 100.")
      return
    }

    // Create deal data with Date objects - CRM context will convert them to ISO strings
    // const dealData = {
    //   title,
    //   customerId,
    //   value: valueNumber,
    //   probability: probabilityNumber,
    //   stage: formData.stage,
    //   assignedTo: formData.assignedTo,
    //   notes: formData.notes || "",
    //   expectedCloseDate,
    //   products: Array.isArray(products) ? products : [],
    // }

    // // Only add actualCloseDate if stage is closed
    // if (formData.stage === "closed-won" || formData.stage === "closed-lost") {
    //   dealData.actualCloseDate = new Date()
    // }

    // Create deal data with Date objects - backend expects ISO strings or null
const dealData = {
  title,
  customerId,
  value: valueNumber,
  probability: probabilityNumber,
  stage: formData.stage,
  assignedTo: formData.assignedTo || null,        // normalize empty string
  notes: formData.notes || "",
  expectedCloseDate: expectedCloseDate || null,   // never undefined
  products: Array.isArray(products) ? products : [],
}

if (formData.stage === "closed-won" || formData.stage === "closed-lost") {
  dealData.actualCloseDate = new Date()
}

    console.log("=== DEAL SUBMISSION DEBUG ===")
    console.log("1. Form data being sent to CRM context:", dealData)
    console.log("2. Mode:", mode)

    setIsSubmitting(true)
    try {
      let ok = false
      if (mode === "add") {
        console.log("3. Calling addDeal...")
        ok = await addDeal(dealData)
        console.log("4. addDeal returned:", ok)
      } else if (deal && mode === "edit") {
        console.log("3. Calling updateDeal...")
        ok = await updateDeal(deal.id, dealData)
        console.log("4. updateDeal returned:", ok)
      }

      if (ok) {
        console.log("5. Success! Closing dialog...")
        onOpenChange(false)
      } else {
        console.error("5. Save failed - Check console for API errors")
        setError("Failed to save deal. Please check your data and try again.")
      }
    } catch (err) {
      console.error("5. Exception caught:", err)
      setError(`Error: ${err?.message || "Failed to save deal. Please try again."}`)
    } finally {
      setIsSubmitting(false)
    }
    console.log("=== END DEBUG ===")
  }

  const addProductToList = () => {
    const trimmed = newProduct.trim()
    if (trimmed && !products.includes(trimmed)) {
      setProducts([...products, trimmed])
      setNewProduct("")
    }
  }

  const removeProduct = (productToRemove) => {
    setProducts(products.filter((product) => product !== productToRemove))
  }

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault()
      addProductToList()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "add" ? "Add New Deal" : "Edit Deal"}</DialogTitle>
          <DialogDescription>
            {mode === "add" ? "Create a new deal in your sales pipeline." : "Update deal information and status."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Deal Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., WhatsApp Panel Setup - Company Name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerId">Customer *</Label>
                <Select
                  value={formData.customerId}
                  onValueChange={(value) => setFormData({ ...formData, customerId: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers && customers.length > 0 ? (
                      customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                          {customer.company ? ` - ${customer.company}` : ""}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="" disabled>No customers available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="value">Deal Value (₹) *</Label>
                <Input
                  id="value"
                  type="number"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="probability">Probability (%) *</Label>
                <Input
                  id="probability"
                  type="number"
                  value={formData.probability}
                  onChange={(e) => setFormData({ ...formData, probability: e.target.value })}
                  min="0"
                  max="100"
                  required
                />
              </div>
            </div>

            {/* Deal Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stage">Stage</Label>
                <Select
                  value={formData.stage}
                  onValueChange={(value) => setFormData({ ...formData, stage: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prospecting">Prospecting</SelectItem>
                    <SelectItem value="qualification">Qualification</SelectItem>
                    <SelectItem value="proposal">Proposal</SelectItem>
                    <SelectItem value="negotiation">Negotiation</SelectItem>
                    <SelectItem value="closed-won">Closed Won</SelectItem>
                    <SelectItem value="closed-lost">Closed Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DateInput
                value={expectedCloseDate}
                onChange={setExpectedCloseDate}
                label="Expected Close Date *"
                required={true}
              />
            </div>

            {/* Products */}
            <div className="space-y-2">
              <Label>Products/Services</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {products.map((product) => (
                  <Badge key={product} variant="secondary" className="flex items-center gap-1">
                    {product}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => removeProduct(product)} />
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newProduct}
                  onChange={(e) => setNewProduct(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Add product or service..."
                />
                <Button type="button" variant="outline" onClick={addProductToList}>
                  Add
                </Button>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                placeholder="Additional notes about this deal..."
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
                {error}
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : mode === "add" ? "Add Deal" : "Update Deal"}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}