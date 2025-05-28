"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Car, Home, Utensils, Download } from "lucide-react"
import Chart from "chart.js/auto"

// PDF generation imports
declare global {
  interface Window {
    jsPDF: any
    html2canvas: any
  }
}

export default function CarbonFootprintCalculator() {
  const [activeTab, setActiveTab] = useState(0)
  const [showResults, setShowResults] = useState(false)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [calculatedEmissions, setCalculatedEmissions] = useState({
    transportEmissions: 0,
    homeEmissions: 0,
    foodEmissions: 0,
    wasteEmissions: 0,
    totalEmissions: 0,
  })
  const [formData, setFormData] = useState({
    carKm: 0,
    busKm: 0,
    trainKm: 0,
    shortFlightKm: 0,
    longFlightKm: 0,
    householdSize: 1,
    electricityUsage: 0,
    gasUsage: 0,
    dietType: "Vegan (No animal products)",
    foodWastePercent: 17,
    wasteAmount: 10,
    recyclingRate: 30,
  })

  const barChartRef = useRef<HTMLCanvasElement>(null)
  const pieChartRef = useRef<HTMLCanvasElement>(null)
  const barChartInstance = useRef<Chart | null>(null)
  const pieChartInstance = useRef<Chart | null>(null)

  const EMISSION_FACTORS = {
    transport: {
      car: 0.21,
      bus: 0.089,
      train: 0.041,
      shortFlight: 0.255,
      longFlight: 0.195,
    },
    electricity: 0.233,
    gas: 0.185,
    food: {
      vegan: 1.5,
      vegetarian: 2.5,
      omnivore: 3.3,
    },
    waste: 0.5,
  }

  const sections = ["🚗 Transport", "🏠 Home", "🍔 Food", "🗑 Waste"]

  // Load external libraries for PDF generation
  useEffect(() => {
    const loadLibraries = async () => {
      if (typeof window !== "undefined" && !window.jsPDF) {
        // Load jsPDF
        const jsPDFScript = document.createElement("script")
        jsPDFScript.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"
        document.head.appendChild(jsPDFScript)

        // Load html2canvas
        const html2canvasScript = document.createElement("script")
        html2canvasScript.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"
        document.head.appendChild(html2canvasScript)
      }
    }
    loadLibraries()
  }, [])

  const showSection = (index: number) => {
    setActiveTab(index)
  }

  const nextSection = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault() // Prevent form submission
    }
    if (activeTab < sections.length - 1) {
      setActiveTab(activeTab + 1)
    }
  }

  const prevSection = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault() // Prevent form submission
    }
    if (activeTab > 0) {
      setActiveTab(activeTab - 1)
    }
  }

  const updateFormData = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const calculateEmissions = () => {
    // Transport emissions
    const transportEmissions =
      formData.carKm * EMISSION_FACTORS.transport.car +
      formData.busKm * EMISSION_FACTORS.transport.bus +
      formData.trainKm * EMISSION_FACTORS.transport.train +
      formData.shortFlightKm * EMISSION_FACTORS.transport.shortFlight +
      formData.longFlightKm * EMISSION_FACTORS.transport.longFlight

    // Home emissions
    const homeEmissions =
      (formData.electricityUsage * EMISSION_FACTORS.electricity + formData.gasUsage * EMISSION_FACTORS.gas) /
      formData.householdSize

    // Food emissions
    let dailyFoodEmissions
    switch (formData.dietType) {
      case "Vegan (No animal products)":
        dailyFoodEmissions = EMISSION_FACTORS.food.vegan
        break
      case "Vegetarian (No meat)":
        dailyFoodEmissions = EMISSION_FACTORS.food.vegetarian
        break
      default:
        dailyFoodEmissions = EMISSION_FACTORS.food.omnivore
    }
    const foodEmissions = dailyFoodEmissions * 30 * (1 + formData.foodWastePercent / 100)

    // Waste emissions
    const wasteEmissions = formData.wasteAmount * EMISSION_FACTORS.waste * (1 - formData.recyclingRate / 100)

    const totalEmissions = transportEmissions + homeEmissions + foodEmissions + wasteEmissions

    return { transportEmissions, homeEmissions, foodEmissions, wasteEmissions, totalEmissions }
  }

  const renderCharts = (labels: string[], values: number[]) => {
    // Destroy existing charts
    if (barChartInstance.current) {
      barChartInstance.current.destroy()
    }
    if (pieChartInstance.current) {
      pieChartInstance.current.destroy()
    }

    if (barChartRef.current) {
      barChartInstance.current = new Chart(barChartRef.current, {
        type: "bar",
        data: {
          labels: labels,
          datasets: [
            {
              label: "kg CO₂/month",
              data: values,
              backgroundColor: ["#4caf50", "#2196f3", "#ff9800", "#9c27b0"],
              borderColor: ["#388e3c", "#1976d2", "#f57c00", "#7b1fa2"],
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: "top",
            },
            title: {
              display: true,
              text: "Your Monthly Carbon Emissions",
              font: {
                size: 16,
              },
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: "kg CO₂/month",
              },
            },
          },
        },
      })
    }

    if (pieChartRef.current) {
      pieChartInstance.current = new Chart(pieChartRef.current, {
        type: "pie",
        data: {
          labels: labels,
          datasets: [
            {
              data: values,
              backgroundColor: ["#4caf50", "#2196f3", "#ff9800", "#9c27b0"],
              borderColor: "#ffffff",
              borderWidth: 2,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "bottom",
              labels: {
                padding: 20,
              },
            },
            title: {
              display: true,
              text: "Emission Breakdown",
              font: {
                size: 16,
              },
            },
          },
        },
      })
    }
  }

  const getPersonalizedTips = (emissions: any) => {
    const tips = []
    const { transportEmissions, homeEmissions, foodEmissions, wasteEmissions } = emissions

    // Transport tips based on actual usage
    if (transportEmissions > 0) {
      if (formData.carKm > 0) {
        tips.push("🚲 Consider cycling or walking for short trips instead of driving")
        tips.push("🚗 Try carpooling or using ride-sharing for longer trips")
      }
      if (formData.busKm > 0) {
        tips.push("🚌 Great job using public transport! Consider cycling for shorter routes")
      }
      if (formData.shortFlightKm > 0 || formData.longFlightKm > 0) {
        tips.push("✈️ Consider video calls instead of business flights when possible")
        tips.push("🚄 Choose trains over flights for shorter distances")
      }
      if (formData.carKm > 500) {
        tips.push("🔌 Consider switching to an electric or hybrid vehicle")
      }
    }

    // Home energy tips based on actual usage
    if (homeEmissions > 0) {
      if (formData.electricityUsage > 300) {
        tips.push("💡 Your electricity usage is high - switch to LED bulbs and energy-efficient appliances")
        tips.push("🔌 Unplug devices when not in use to reduce standby power consumption")
      }
      if (formData.gasUsage > 200) {
        tips.push("🌡️ Lower your thermostat by 1-2°C to significantly reduce heating emissions")
        tips.push("🏠 Improve home insulation to reduce heating/cooling needs")
      }
      if (formData.electricityUsage > 0) {
        tips.push("☀️ Consider installing solar panels or switching to renewable energy")
      }
    }

    // Food tips based on diet and waste
    if (foodEmissions > 0) {
      if (formData.dietType === "Omnivore (Meat & plant-based)") {
        tips.push("🥬 Try having 1-2 meat-free days per week to reduce your food footprint")
        tips.push("🐟 Choose chicken or fish over beef and lamb when eating meat")
      }
      if (formData.foodWastePercent > 20) {
        tips.push("📝 Plan your meals and make shopping lists to reduce food waste")
        tips.push("🥘 Use leftovers creatively and store food properly to extend freshness")
      }
      if (formData.foodWastePercent > 30) {
        tips.push("♻️ Start composting your food scraps instead of throwing them away")
      }
      tips.push("🛒 Buy local and seasonal produce to reduce transportation emissions")
    }

    // Waste tips based on actual waste and recycling
    if (wasteEmissions > 0) {
      if (formData.recyclingRate < 50) {
        tips.push("♻️ Increase your recycling rate - you're currently at " + formData.recyclingRate + "%")
        tips.push("📦 Learn about your local recycling guidelines to recycle more effectively")
      }
      if (formData.wasteAmount > 15) {
        tips.push("🛍️ Use reusable bags, containers, and water bottles to reduce waste")
        tips.push("📦 Choose products with minimal packaging when shopping")
      }
      if (formData.wasteAmount > 20) {
        tips.push("🔄 Repair and donate items instead of throwing them away")
      }
    }

    // Add general tips if emissions are low
    if (transportEmissions === 0) {
      tips.push("🌟 Excellent! You have zero transport emissions - keep it up!")
    }
    if (homeEmissions === 0) {
      tips.push("🌟 Amazing! Your home has zero emissions - you're leading by example!")
    }

    // Remove duplicates and limit to 8 tips
    return [...new Set(tips)].slice(0, 8)
  }

  const generatePDF = async () => {
    if (!window.jsPDF || !window.html2canvas) {
      alert("PDF libraries are still loading. Please try again in a moment.")
      return
    }

    setIsGeneratingPDF(true)

    try {
      const { jsPDF } = window
      const pdf = new jsPDF("p", "mm", "a4")
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      let yPosition = 20

      // Title
      pdf.setFontSize(24)
      pdf.setTextColor(46, 125, 50) // Green color
      pdf.text("🌿 Carbon Footprint Report", pageWidth / 2, yPosition, { align: "center" })
      yPosition += 15

      // Date
      pdf.setFontSize(12)
      pdf.setTextColor(100, 100, 100)
      const currentDate = new Date().toLocaleDateString()
      pdf.text(`Generated on: ${currentDate}`, pageWidth / 2, yPosition, { align: "center" })
      yPosition += 20

      // Summary Section
      pdf.setFontSize(16)
      pdf.setTextColor(0, 0, 0)
      pdf.text("📊 Emission Summary", 20, yPosition)
      yPosition += 10

      pdf.setFontSize(12)
      const emissions = calculatedEmissions
      const summaryData = [
        `Total Monthly Emissions: ${emissions.totalEmissions.toFixed(2)} kg CO₂`,
        `Annual Estimate: ${(emissions.totalEmissions * 12).toFixed(2)} kg CO₂`,
        "",
        "Breakdown by Category:",
        `• Transportation: ${emissions.transportEmissions.toFixed(2)} kg CO₂ (${((emissions.transportEmissions / emissions.totalEmissions) * 100).toFixed(1)}%)`,
        `• Home Energy: ${emissions.homeEmissions.toFixed(2)} kg CO₂ (${((emissions.homeEmissions / emissions.totalEmissions) * 100).toFixed(1)}%)`,
        `• Food: ${emissions.foodEmissions.toFixed(2)} kg CO₂ (${((emissions.foodEmissions / emissions.totalEmissions) * 100).toFixed(1)}%)`,
        `• Waste: ${emissions.wasteEmissions.toFixed(2)} kg CO₂ (${((emissions.wasteEmissions / emissions.totalEmissions) * 100).toFixed(1)}%)`,
      ]

      summaryData.forEach((line) => {
        if (line === "") {
          yPosition += 5
        } else {
          pdf.text(line, 20, yPosition)
          yPosition += 7
        }
      })

      yPosition += 10

      // Input Data Section
      pdf.setFontSize(16)
      pdf.text("📝 Your Input Data", 20, yPosition)
      yPosition += 10

      pdf.setFontSize(10)
      const inputData = [
        "Transportation:",
        `  Car/Motorbike: ${formData.carKm} km/month`,
        `  Public Transit: ${formData.busKm} km/month`,
        `  Train: ${formData.trainKm} km/month`,
        `  Short Flights: ${formData.shortFlightKm} km/month`,
        `  Long Flights: ${formData.longFlightKm} km/month`,
        "",
        "Home Energy:",
        `  Household Size: ${formData.householdSize} people`,
        `  Electricity: ${formData.electricityUsage} kWh/month`,
        `  Gas/Heating: ${formData.gasUsage} kWh/month`,
        "",
        "Food & Lifestyle:",
        `  Diet Type: ${formData.dietType}`,
        `  Food Waste: ${formData.foodWastePercent}%`,
        "",
        "Waste Management:",
        `  Monthly Waste: ${formData.wasteAmount} kg`,
        `  Recycling Rate: ${formData.recyclingRate}%`,
      ]

      inputData.forEach((line) => {
        if (line === "") {
          yPosition += 3
        } else {
          pdf.text(line, 20, yPosition)
          yPosition += 5
        }
      })

      // Add new page for charts
      pdf.addPage()
      yPosition = 20

      pdf.setFontSize(16)
      pdf.text("📈 Visual Analysis", 20, yPosition)
      yPosition += 15

      // Capture and add bar chart
      if (barChartRef.current) {
        const barCanvas = await window.html2canvas(barChartRef.current, {
          backgroundColor: "#ffffff",
          scale: 2,
        })
        const barImgData = barCanvas.toDataURL("image/png")
        const barImgWidth = 160
        const barImgHeight = (barCanvas.height * barImgWidth) / barCanvas.width

        pdf.addImage(barImgData, "PNG", 20, yPosition, barImgWidth, barImgHeight)
        yPosition += barImgHeight + 10
      }

      // Capture and add pie chart
      if (pieChartRef.current && yPosition + 100 < pageHeight) {
        const pieCanvas = await window.html2canvas(pieChartRef.current, {
          backgroundColor: "#ffffff",
          scale: 2,
        })
        const pieImgData = pieCanvas.toDataURL("image/png")
        const pieImgWidth = 120
        const pieImgHeight = (pieCanvas.height * pieImgWidth) / pieCanvas.width

        pdf.addImage(pieImgData, "PNG", 20, yPosition, pieImgWidth, pieImgHeight)
      } else if (pieChartRef.current) {
        // Add pie chart on new page if not enough space
        pdf.addPage()
        yPosition = 20

        const pieCanvas = await window.html2canvas(pieChartRef.current, {
          backgroundColor: "#ffffff",
          scale: 2,
        })
        const pieImgData = pieCanvas.toDataURL("image/png")
        const pieImgWidth = 120
        const pieImgHeight = (pieCanvas.height * pieImgWidth) / pieCanvas.width

        pdf.addImage(pieImgData, "PNG", 20, yPosition, pieImgWidth, pieImgHeight)
        yPosition += pieImgHeight + 15
      }

      // Add new page for tips
      pdf.addPage()
      yPosition = 20

      // Personalized Tips Section
      pdf.setFontSize(16)
      pdf.setTextColor(0, 0, 0)
      pdf.text("💡 Personalized Recommendations", 20, yPosition)
      yPosition += 15

      pdf.setFontSize(12)
      const tips = getPersonalizedTips(emissions)
      tips.forEach((tip, index) => {
        const lines = pdf.splitTextToSize(tip, pageWidth - 40)
        lines.forEach((line: string) => {
          pdf.text(line, 20, yPosition)
          yPosition += 7
        })
        yPosition += 3
      })

      yPosition += 10

      // Comparison with averages
      pdf.setFontSize(14)
      pdf.text("🌍 How You Compare", 20, yPosition)
      yPosition += 10

      pdf.setFontSize(12)
      const globalAverage = 4000 // kg CO2 per year
      const userAnnual = emissions.totalEmissions * 12
      const comparison = userAnnual < globalAverage ? "below" : "above"
      const percentage = Math.abs(((userAnnual - globalAverage) / globalAverage) * 100).toFixed(1)

      pdf.text(`Global Average: ${globalAverage} kg CO₂/year`, 20, yPosition)
      yPosition += 7
      pdf.text(`Your Estimate: ${userAnnual.toFixed(0)} kg CO₂/year`, 20, yPosition)
      yPosition += 7
      pdf.text(`You are ${percentage}% ${comparison} the global average.`, 20, yPosition)

      // Footer
      yPosition = pageHeight - 20
      pdf.setFontSize(10)
      pdf.setTextColor(100, 100, 100)
      pdf.text(
        "Carbon Footprint Calculator © 2025 | Emission factors are approximate estimates",
        pageWidth / 2,
        yPosition,
        { align: "center" },
      )

      // Save the PDF
      pdf.save(`carbon-footprint-report-${currentDate.replace(/\//g, "-")}.pdf`)
    } catch (error) {
      console.error("Error generating PDF:", error)
      alert("There was an error generating the PDF. Please try again.")
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // This should only be called when clicking "Calculate Footprint" button
    // which only appears on the last section (Waste)
    const emissions = calculateEmissions()
    setCalculatedEmissions(emissions)
    setShowResults(true)

    const labels = ["Transport", "Home Energy", "Food", "Waste"]
    const values = [
      emissions.transportEmissions,
      emissions.homeEmissions,
      emissions.foodEmissions,
      emissions.wasteEmissions,
    ]

    setTimeout(() => {
      renderCharts(labels, values)
      document.getElementById("results-section")?.scrollIntoView({ behavior: "smooth" })
    }, 200)
  }

  useEffect(() => {
    return () => {
      if (barChartInstance.current) {
        barChartInstance.current.destroy()
      }
      if (pieChartInstance.current) {
        pieChartInstance.current.destroy()
      }
    }
  }, [])

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-green-600 text-white text-center py-6">
        <h1 className="text-3xl font-bold">🌿 Carbon Footprint Calculator</h1>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-center mb-4">Track Your Carbon Footprint</h2>
          <p className="text-center text-gray-600 mb-6">
            Understand your environmental impact and discover ways to reduce your carbon footprint.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-green-100 p-6 rounded-lg text-center">
              <Car className="h-10 w-10 mx-auto mb-2 text-green-700" />
              <div className="font-semibold">Transportation</div>
            </div>
            <div className="bg-blue-100 p-6 rounded-lg text-center">
              <Home className="h-10 w-10 mx-auto mb-2 text-blue-700" />
              <div className="font-semibold">Energy Usage</div>
            </div>
            <div className="bg-orange-100 p-6 rounded-lg text-center">
              <Utensils className="h-10 w-10 mx-auto mb-2 text-orange-700" />
              <div className="font-semibold">Diet & Waste</div>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg mb-6">
            <strong>📌 Why Track Your Carbon Footprint?</strong>
            <br />
            Understanding your carbon footprint helps you identify which aspects of your lifestyle have the greatest
            environmental impact...
          </div>
        </section>

        <section className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4">📊 Carbon Footprint Calculator</h3>

          <div className="flex flex-wrap gap-2 mb-6">
            {sections.map((section, index) => (
              <button
                key={index}
                onClick={() => showSection(index)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === index ? "bg-green-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {section}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            {/* Transport Section */}
            {activeTab === 0 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Monthly Motorbike/Car Distance (km)</label>
                  <input
                    type="number"
                    value={formData.carKm}
                    onChange={(e) => updateFormData("carKm", Number.parseFloat(e.target.value) || 0)}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Monthly Bus/Public Transit Distance (km)</label>
                  <input
                    type="number"
                    value={formData.busKm}
                    onChange={(e) => updateFormData("busKm", Number.parseFloat(e.target.value) || 0)}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Monthly Train Distance (km)</label>
                  <input
                    type="number"
                    value={formData.trainKm}
                    onChange={(e) => updateFormData("trainKm", Number.parseFloat(e.target.value) || 0)}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                  />
                </div>
                <h4 className="text-lg font-semibold mt-6">✈️ Air Travel This Month</h4>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Short flights (under 3 hours) - Distance (km)
                  </label>
                  <input
                    type="number"
                    value={formData.shortFlightKm}
                    onChange={(e) => updateFormData("shortFlightKm", Number.parseFloat(e.target.value) || 0)}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Long flights (over 3 hours) - Distance (km)</label>
                  <input
                    type="number"
                    value={formData.longFlightKm}
                    onChange={(e) => updateFormData("longFlightKm", Number.parseFloat(e.target.value) || 0)}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            )}

            {/* Home Section */}
            {activeTab === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Number of People in Your Household</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.householdSize}
                    onChange={(e) => updateFormData("householdSize", Number.parseFloat(e.target.value) || 1)}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                  />
                  <small className="text-gray-500">
                    This helps us divide household emissions fairly among occupants
                  </small>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Monthly Electricity Usage (kWh)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.electricityUsage}
                    onChange={(e) => updateFormData("electricityUsage", Number.parseFloat(e.target.value) || 0)}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                  />
                  <small className="text-gray-500">Check your electricity bill or meter for this information</small>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Monthly Natural Gas/Heating Fuel Usage (kWh)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.gasUsage}
                    onChange={(e) => updateFormData("gasUsage", Number.parseFloat(e.target.value) || 0)}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            )}

            {/* Food Section */}
            {activeTab === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Your Diet Type</label>
                  <select
                    value={formData.dietType}
                    onChange={(e) => updateFormData("dietType", e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                  >
                    <option>Vegan (No animal products)</option>
                    <option>Vegetarian (No meat)</option>
                    <option>Omnivore (Meat & plant-based)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Percentage of Food Wasted: {formData.foodWastePercent}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={formData.foodWastePercent}
                    onChange={(e) => updateFormData("foodWastePercent", Number.parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <small className="text-gray-500">The global average is around 30% of food wasted</small>
                </div>
              </div>
            )}

            {/* Waste Section */}
            {activeTab === 3 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Monthly Household Waste (kg)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.wasteAmount}
                    onChange={(e) => updateFormData("wasteAmount", Number.parseFloat(e.target.value) || 0)}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                  />
                  <small className="text-gray-500">Estimate how much trash your household generates each month</small>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Recycling Rate: {formData.recyclingRate}%</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={formData.recyclingRate}
                    onChange={(e) => updateFormData("recyclingRate", Number.parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <small className="text-gray-500">Estimate what percentage of your waste you recycle</small>
                </div>
              </div>
            )}

            <div className="flex justify-between mt-6">
              <button
                type="button"
                onClick={(e) => prevSection(e)}
                disabled={activeTab === 0}
                className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg disabled:opacity-50"
              >
                Previous
              </button>
              {activeTab < sections.length - 1 ? (
                <button
                  type="button"
                  onClick={(e) => nextSection(e)}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Next
                </button>
              ) : (
                <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                  Calculate Footprint
                </button>
              )}
            </div>
          </form>
        </section>

        {showResults && (
          <section id="results-section" className="mt-8 p-6 bg-white rounded-lg shadow-lg">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">🌍 Your Carbon Footprint Report</h2>
              <button
                onClick={generatePDF}
                disabled={isGeneratingPDF}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="h-4 w-4" />
                {isGeneratingPDF ? "Generating..." : "Download PDF"}
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="text-lg font-semibold mb-4">Category-wise Emissions</h3>
                <div className="relative h-80">
                  <canvas ref={barChartRef}></canvas>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4">Emission Breakdown</h3>
                <div className="relative h-80">
                  <canvas ref={pieChartRef}></canvas>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">📊 Monthly Summary</h4>
                <p className="text-2xl font-bold text-blue-600">
                  {calculatedEmissions.totalEmissions.toFixed(2)} kg CO₂
                </p>
                <p className="text-sm text-gray-600">Total monthly emissions</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">📅 Annual Estimate</h4>
                <p className="text-2xl font-bold text-green-600">
                  {(calculatedEmissions.totalEmissions * 12).toFixed(2)} kg CO₂
                </p>
                <p className="text-sm text-gray-600">Projected yearly emissions</p>
              </div>
            </div>

            <div className="bg-yellow-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">💡 Personalized Tips to Reduce Your Footprint</h3>
              <ul className="space-y-2">
                {getPersonalizedTips(calculatedEmissions).map((tip, index) => (
                  <li key={index}>{tip}</li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </main>

      <footer className="bg-gray-800 text-white text-center py-4 mt-8">
        Carbon Footprint Calculator © 2025
        <br />
        Emission factors are approximate. This calculator provides estimates only.
      </footer>
    </div>
  )
}
