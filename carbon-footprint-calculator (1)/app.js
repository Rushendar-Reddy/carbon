"use client"

import { Chart } from "@/components/ui/chart"

import React from "react"

const { useState, useRef, useEffect, useCallback } = React
const {
  Car,
  Home,
  Utensils,
  Download,
  Share2,
  Save,
  Moon,
  Sun,
  CheckCircle,
  AlertCircle,
  Info,
  X,
  BarChart3,
  PieChart,
  TrendingUp,
  Leaf,
  Zap,
  Recycle,
  Plane,
  Calculator,
  Target,
  Award,
  Globe,
  Users,
} = lucide

// Utility Functions
const showToast = (message, type = "info") => {
  const container = document.getElementById("toast-container")
  const toast = document.createElement("div")
  toast.className = `toast ${type}`

  const icons = {
    success: "✓",
    error: "✗",
    warning: "⚠",
    info: "ℹ",
  }

  toast.innerHTML = `
    <div class="toast-icon">${icons[type]}</div>
    <div class="toast-message">${message}</div>
    <button class="toast-close">×</button>
  `

  container.appendChild(toast)

  // Auto remove
  setTimeout(() => {
    if (toast.parentNode) {
      toast.style.animation = "slideOutRight 0.3s ease forwards"
      setTimeout(() => toast.remove(), 300)
    }
  }, 5000)

  // Manual close
  toast.querySelector(".toast-close").onclick = () => {
    toast.style.animation = "slideOutRight 0.3s ease forwards"
    setTimeout(() => toast.remove(), 300)
  }
}

// Local Storage Utilities
const saveToLocalStorage = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data))
    return true
  } catch (error) {
    console.error("Failed to save to localStorage:", error)
    return false
  }
}

const loadFromLocalStorage = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : defaultValue
  } catch (error) {
    console.error("Failed to load from localStorage:", error)
    return defaultValue
  }
}

// Theme Hook
const useTheme = () => {
  const [theme, setTheme] = useState(() => loadFromLocalStorage("theme", "light"))

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme)
    saveToLocalStorage("theme", theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"))
    showToast(`Switched to ${theme === "light" ? "dark" : "light"} mode`, "success")
  }

  return { theme, toggleTheme }
}

// Form Validation Hook
const useFormValidation = (formData) => {
  const [errors, setErrors] = useState({})

  const validateField = (field, value) => {
    const newErrors = { ...errors }

    switch (field) {
      case "householdSize":
        if (value < 1) {
          newErrors[field] = "Household size must be at least 1"
        } else {
          delete newErrors[field]
        }
        break
      case "electricityUsage":
      case "gasUsage":
        if (value < 0) {
          newErrors[field] = "Value cannot be negative"
        } else if (value > 10000) {
          newErrors[field] = "Value seems unusually high"
        } else {
          delete newErrors[field]
        }
        break
      default:
        if (value < 0) {
          newErrors[field] = "Value cannot be negative"
        } else {
          delete newErrors[field]
        }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  return { errors, validateField }
}

// Statistics Hook
const useStatistics = (savedCalculations) => {
  const [stats, setStats] = useState({
    totalCalculations: 0,
    averageEmissions: 0,
    lastChange: 0,
    bestMonth: 0,
  })

  useEffect(() => {
    if (savedCalculations.length === 0) return

    const totalCalculations = savedCalculations.length
    const averageEmissions =
      savedCalculations.reduce((sum, calc) => sum + calc.emissions.totalEmissions, 0) / totalCalculations

    let lastChange = 0
    if (savedCalculations.length >= 2) {
      const latest = savedCalculations[savedCalculations.length - 1]
      const previous = savedCalculations[savedCalculations.length - 2]
      lastChange =
        ((latest.emissions.totalEmissions - previous.emissions.totalEmissions) / previous.emissions.totalEmissions) *
        100
    }

    const bestMonth = Math.min(...savedCalculations.map((calc) => calc.emissions.totalEmissions))

    setStats({
      totalCalculations,
      averageEmissions,
      lastChange,
      bestMonth,
    })
  }, [savedCalculations])

  return stats
}

// Main Component
const CarbonFootprintCalculator = () => {
  // State Management
  const [activeTab, setActiveTab] = useState(0)
  const [showResults, setShowResults] = useState(false)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [completedSections, setCompletedSections] = useState([])
  const [savedCalculations, setSavedCalculations] = useState(() => loadFromLocalStorage("saved-calculations", []))

  const [calculatedEmissions, setCalculatedEmissions] = useState({
    transportEmissions: 0,
    homeEmissions: 0,
    foodEmissions: 0,
    wasteEmissions: 0,
    totalEmissions: 0,
  })

  const [formData, setFormData] = useState(() =>
    loadFromLocalStorage("form-data", {
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
    }),
  )

  // Hooks
  const { theme, toggleTheme } = useTheme()
  const { errors, validateField } = useFormValidation(formData)
  const stats = useStatistics(savedCalculations)

  // Refs
  const barChartRef = useRef(null)
  const pieChartRef = useRef(null)
  const barChartInstance = useRef(null)
  const pieChartInstance = useRef(null)

  // Constants
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

  const sections = [
    { id: 0, name: "🚗 Transport", icon: Car },
    { id: 1, name: "🏠 Home", icon: Home },
    { id: 2, name: "🍔 Food", icon: Utensils },
    { id: 3, name: "🗑 Waste", icon: Recycle },
  ]

  // Auto-save form data
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      saveToLocalStorage("form-data", formData)
    }, 1000)

    return () => clearTimeout(timeoutId)
  }, [formData])

  // Loading screen effect
  useEffect(() => {
    const timer = setTimeout(() => {
      document.getElementById("loading-screen").classList.add("hidden")
      document.getElementById("root").style.display = "block"

      // Animate elements on load
      if (window.gsap) {
        gsap.from(".header", { duration: 1, y: -50, opacity: 0 })
        gsap.from(".dashboard-stats", { duration: 1, y: 50, opacity: 0, delay: 0.3 })
        gsap.from(".calculator-section", { duration: 1, y: 50, opacity: 0, delay: 0.6 })
      }
    }, 2000)

    return () => clearTimeout(timer)
  }, [])

  // Navigation Functions
  const showSection = (index) => {
    if (window.gsap) {
      gsap.to(".form-section.active", {
        duration: 0.3,
        x: -20,
        opacity: 0,
        onComplete: () => {
          setActiveTab(index)
          gsap.fromTo(".form-section.active", { x: 20, opacity: 0 }, { duration: 0.3, x: 0, opacity: 1 })
        },
      })
    } else {
      setActiveTab(index)
    }
  }

  const nextSection = (e) => {
    if (e) e.preventDefault()

    // Mark current section as completed
    if (!completedSections.includes(activeTab)) {
      setCompletedSections((prev) => [...prev, activeTab])
    }

    if (activeTab < sections.length - 1) {
      showSection(activeTab + 1)
      showToast(`Moved to ${sections[activeTab + 1].name}`, "success")
    }
  }

  const prevSection = (e) => {
    if (e) e.preventDefault()
    if (activeTab > 0) {
      showSection(activeTab - 1)
    }
  }

  const updateFormData = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    validateField(field, value)
  }

  // Calculation Functions
  const calculateEmissions = () => {
    const transportEmissions =
      formData.carKm * EMISSION_FACTORS.transport.car +
      formData.busKm * EMISSION_FACTORS.transport.bus +
      formData.trainKm * EMISSION_FACTORS.transport.train +
      formData.shortFlightKm * EMISSION_FACTORS.transport.shortFlight +
      formData.longFlightKm * EMISSION_FACTORS.transport.longFlight

    const homeEmissions =
      (formData.electricityUsage * EMISSION_FACTORS.electricity + formData.gasUsage * EMISSION_FACTORS.gas) /
      formData.householdSize

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

    const wasteEmissions = formData.wasteAmount * EMISSION_FACTORS.waste * (1 - formData.recyclingRate / 100)

    const totalEmissions = transportEmissions + homeEmissions + foodEmissions + wasteEmissions

    return { transportEmissions, homeEmissions, foodEmissions, wasteEmissions, totalEmissions }
  }

  // Chart Rendering with Enhanced Styling
  const renderCharts = (labels, values) => {
    if (barChartInstance.current) {
      barChartInstance.current.destroy()
    }
    if (pieChartInstance.current) {
      pieChartInstance.current.destroy()
    }

    const colors = [
      "rgba(16, 185, 129, 0.8)",
      "rgba(59, 130, 246, 0.8)",
      "rgba(245, 158, 11, 0.8)",
      "rgba(139, 69, 19, 0.8)",
    ]

    const borderColors = [
      "rgba(16, 185, 129, 1)",
      "rgba(59, 130, 246, 1)",
      "rgba(245, 158, 11, 1)",
      "rgba(139, 69, 19, 1)",
    ]

    if (barChartRef.current) {
      barChartInstance.current = new Chart(barChartRef.current, {
        type: "bar",
        data: {
          labels: labels,
          datasets: [
            {
              label: "kg CO₂/month",
              data: values,
              backgroundColor: colors,
              borderColor: borderColors,
              borderWidth: 2,
              borderRadius: 8,
              borderSkipped: false,
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
              labels: {
                usePointStyle: true,
                padding: 20,
                font: { size: 14, weight: "600" },
              },
            },
            title: {
              display: true,
              text: "Your Monthly Carbon Emissions",
              font: { size: 18, weight: "700" },
              color: "#059669",
            },
            tooltip: {
              backgroundColor: "rgba(0, 0, 0, 0.8)",
              titleColor: "#fff",
              bodyColor: "#fff",
              borderColor: "#10b981",
              borderWidth: 1,
              cornerRadius: 8,
              callbacks: {
                label: (context) => {
                  const percentage = ((context.raw / values.reduce((a, b) => a + b, 0)) * 100).toFixed(1)
                  return `${context.dataset.label}: ${context.raw.toFixed(2)} kg CO₂ (${percentage}%)`
                },
              },
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: "kg CO₂/month",
                font: { size: 14, weight: "600" },
              },
              grid: { color: "rgba(0, 0, 0, 0.1)" },
            },
            x: {
              grid: { display: false },
              ticks: { font: { size: 12, weight: "500" } },
            },
          },
          animation: {
            duration: 2000,
            easing: "easeInOutQuart",
          },
        },
      })
    }

    if (pieChartRef.current) {
      pieChartInstance.current = new Chart(pieChartRef.current, {
        type: "doughnut",
        data: {
          labels: labels,
          datasets: [
            {
              data: values,
              backgroundColor: colors,
              borderColor: borderColors,
              borderWidth: 3,
              hoverBorderWidth: 5,
              hoverOffset: 10,
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
                usePointStyle: true,
                font: { size: 12, weight: "500" },
              },
            },
            title: {
              display: true,
              text: "Emission Breakdown",
              font: { size: 18, weight: "700" },
              color: "#059669",
            },
            tooltip: {
              backgroundColor: "rgba(0, 0, 0, 0.8)",
              titleColor: "#fff",
              bodyColor: "#fff",
              borderColor: "#10b981",
              borderWidth: 1,
              cornerRadius: 8,
              callbacks: {
                label: (context) => {
                  const percentage = ((context.raw / values.reduce((a, b) => a + b, 0)) * 100).toFixed(1)
                  return `${context.label}: ${context.raw.toFixed(2)} kg CO₂ (${percentage}%)`
                },
              },
            },
          },
          animation: {
            animateRotate: true,
            animateScale: true,
            duration: 2000,
            easing: "easeInOutQuart",
          },
          cutout: "60%",
        },
      })
    }
  }

  // Enhanced Tips Generation
  const getPersonalizedTips = (emissions) => {
    const tips = []
    const { transportEmissions, homeEmissions, foodEmissions, wasteEmissions } = emissions

    // Transport tips
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

    // Home energy tips
    if (homeEmissions > 0) {
      if (formData.electricityUsage > 300) {
        tips.push("💡 Switch to LED bulbs and energy-efficient appliances")
        tips.push("🔌 Unplug devices when not in use to reduce standby power")
      }
      if (formData.gasUsage > 200) {
        tips.push("🌡️ Lower your thermostat by 1-2°C to reduce heating emissions")
        tips.push("🏠 Improve home insulation to reduce energy needs")
      }
      tips.push("☀️ Consider installing solar panels or switching to renewable energy")
    }

    // Food tips
    if (foodEmissions > 0) {
      if (formData.dietType === "Omnivore (Meat & plant-based)") {
        tips.push("🥬 Try having 1-2 meat-free days per week")
        tips.push("🐟 Choose chicken or fish over beef and lamb")
      }
      if (formData.foodWastePercent > 20) {
        tips.push("📝 Plan your meals and make shopping lists")
        tips.push("🥘 Use leftovers creatively and store food properly")
      }
      if (formData.foodWastePercent > 30) {
        tips.push("♻️ Start composting your food scraps")
      }
      tips.push("🛒 Buy local and seasonal produce")
    }

    // Waste tips
    if (wasteEmissions > 0) {
      if (formData.recyclingRate < 50) {
        tips.push(`♻️ Increase your recycling rate from ${formData.recyclingRate}%`)
        tips.push("📦 Learn about your local recycling guidelines")
      }
      if (formData.wasteAmount > 15) {
        tips.push("🛍️ Use reusable bags, containers, and water bottles")
        tips.push("📦 Choose products with minimal packaging")
      }
      if (formData.wasteAmount > 20) {
        tips.push("🔄 Repair and donate items instead of throwing them away")
      }
    }

    // Positive reinforcement
    if (transportEmissions === 0) {
      tips.push("🌟 Excellent! You have zero transport emissions")
    }
    if (homeEmissions === 0) {
      tips.push("🌟 Amazing! Your home has zero emissions")
    }

    return [...new Set(tips)].slice(0, 12)
  }

  // Enhanced PDF Generation
  const generatePDF = async () => {
    if (!window.jsPDF || !window.html2canvas) {
      showToast("PDF libraries are still loading. Please try again.", "warning")
      return
    }

    setIsGeneratingPDF(true)
    showToast("Generating your comprehensive PDF report...", "info")

    try {
      const { jsPDF } = window
      const pdf = new jsPDF("p", "mm", "a4")
      const pageWidth = pdf.internal.pageSize.getWidth()
      let yPosition = 20

      // Enhanced Title Page
      pdf.setFontSize(28)
      pdf.setTextColor(16, 185, 129)
      pdf.text("🌿 Carbon Footprint Report", pageWidth / 2, yPosition, { align: "center" })
      yPosition += 20

      pdf.setFontSize(14)
      pdf.setTextColor(100, 100, 100)
      const currentDate = new Date().toLocaleDateString()
      pdf.text(`Generated on: ${currentDate}`, pageWidth / 2, yPosition, { align: "center" })
      yPosition += 30

      // Executive Summary
      pdf.setFontSize(18)
      pdf.setTextColor(0, 0, 0)
      pdf.text("📊 Executive Summary", 20, yPosition)
      yPosition += 15

      const emissions = calculatedEmissions
      const globalAverage = 333 // kg CO2 per month
      const comparison = ((emissions.totalEmissions / globalAverage) * 100).toFixed(0)

      pdf.setFontSize(12)
      const summaryData = [
        `Your Monthly Footprint: ${emissions.totalEmissions.toFixed(2)} kg CO₂`,
        `Annual Projection: ${(emissions.totalEmissions * 12).toFixed(2)} kg CO₂`,
        `Global Comparison: ${comparison}% of average (${globalAverage} kg CO₂/month)`,
        "",
        "Category Breakdown:",
        `• Transportation: ${emissions.transportEmissions.toFixed(2)} kg CO₂ (${((emissions.transportEmissions / emissions.totalEmissions) * 100).toFixed(1)}%)`,
        `• Home Energy: ${emissions.homeEmissions.toFixed(2)} kg CO₂ (${((emissions.homeEmissions / emissions.totalEmissions) * 100).toFixed(1)}%)`,
        `• Food & Diet: ${emissions.foodEmissions.toFixed(2)} kg CO₂ (${((emissions.foodEmissions / emissions.totalEmissions) * 100).toFixed(1)}%)`,
        `• Waste Management: ${emissions.wasteEmissions.toFixed(2)} kg CO₂ (${((emissions.wasteEmissions / emissions.totalEmissions) * 100).toFixed(1)}%)`,
      ]

      summaryData.forEach((line) => {
        if (line === "") {
          yPosition += 5
        } else {
          pdf.text(line, 20, yPosition)
          yPosition += 7
        }
      })

      // Add charts on new page
      pdf.addPage()
      yPosition = 20

      pdf.setFontSize(18)
      pdf.text("📈 Visual Analysis", 20, yPosition)
      yPosition += 15

      // Capture charts
      if (barChartRef.current) {
        const barCanvas = await window.html2canvas(barChartRef.current, {
          backgroundColor: "#ffffff",
          scale: 2,
        })
        const barImgData = barCanvas.toDataURL("image/png")
        const barImgWidth = 160
        const barImgHeight = (barCanvas.height * barImgWidth) / barCanvas.width

        pdf.addImage(barImgData, "PNG", 20, yPosition, barImgWidth, barImgHeight)
        yPosition += barImgHeight + 15
      }

      // Add recommendations
      pdf.addPage()
      yPosition = 20

      pdf.setFontSize(18)
      pdf.text("💡 Personalized Action Plan", 20, yPosition)
      yPosition += 15

      pdf.setFontSize(12)
      const tips = getPersonalizedTips(emissions)
      tips.forEach((tip, index) => {
        const lines = pdf.splitTextToSize(`${index + 1}. ${tip}`, pageWidth - 40)
        lines.forEach((line) => {
          pdf.text(line, 20, yPosition)
          yPosition += 7
        })
        yPosition += 3
      })

      // Footer
      yPosition = pdf.internal.pageSize.getHeight() - 20
      pdf.setFontSize(10)
      pdf.setTextColor(100, 100, 100)
      pdf.text(
        "Advanced Carbon Footprint Calculator © 2025 | Data is estimated for educational purposes",
        pageWidth / 2,
        yPosition,
        { align: "center" },
      )

      // Save PDF
      pdf.save(`carbon-footprint-report-${currentDate.replace(/\//g, "-")}.pdf`)
      showToast("PDF report downloaded successfully!", "success")
    } catch (error) {
      console.error("Error generating PDF:", error)
      showToast("Error generating PDF. Please try again.", "error")
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  // Share Function
  const shareResults = async () => {
    const shareData = {
      title: "My Carbon Footprint Report",
      text: `I calculated my carbon footprint: ${calculatedEmissions.totalEmissions.toFixed(2)} kg CO₂/month. Check out this advanced calculator!`,
      url: window.location.href,
    }

    try {
      if (navigator.share) {
        await navigator.share(shareData)
        showToast("Shared successfully!", "success")
      } else {
        await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`)
        showToast("Link copied to clipboard!", "success")
      }
    } catch (error) {
      showToast("Sharing failed. Please try again.", "error")
    }
  }

  // Save Calculation
  const saveCalculation = () => {
    const calculation = {
      id: Date.now(),
      date: new Date().toLocaleDateString(),
      formData: { ...formData },
      emissions: { ...calculatedEmissions },
    }

    const updated = [...savedCalculations, calculation].slice(-10)
    setSavedCalculations(updated)
    saveToLocalStorage("saved-calculations", updated)
    showToast("Calculation saved successfully!", "success")
  }

  // Form Submission
  const handleSubmit = (e) => {
    e.preventDefault()

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

      // Animate results
      if (window.gsap) {
        gsap.from(".results-section", { duration: 0.8, y: 50, opacity: 0 })
        gsap.from(".summary-card", { duration: 0.6, y: 30, opacity: 0, stagger: 0.1, delay: 0.3 })
        gsap.from(".chart-container", { duration: 0.8, scale: 0.9, opacity: 0, stagger: 0.2, delay: 0.5 })
      }

      showToast("Carbon footprint calculated successfully!", "success")
    }, 200)
  }

  // Progress calculation
  const progressPercentage = ((activeTab + 1) / sections.length) * 100

  // Global comparison
  const globalAverageMonthly = 333
  const comparisonPercentage =
    calculatedEmissions.totalEmissions > 0
      ? ((calculatedEmissions.totalEmissions / globalAverageMonthly) * 100).toFixed(0)
      : 0

  // Cleanup
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

  return React.createElement(
    "div",
    { className: "container" },

    // Header
    React.createElement(
      "header",
      { className: "header" },
      React.createElement(
        "div",
        { className: "header-content" },
        React.createElement("h1", null, "🌿 Advanced Carbon Calculator"),
        React.createElement("p", { className: "header-subtitle" }, "Professional Environmental Impact Tracker"),
      ),
      React.createElement(
        "button",
        {
          className: "theme-toggle",
          onClick: toggleTheme,
          "aria-label": "Toggle theme",
        },
        theme === "light" ? React.createElement(Moon, { size: 20 }) : React.createElement(Sun, { size: 20 }),
      ),
    ),

    // Main Content
    React.createElement(
      "main",
      { className: "main-content" },

      // Dashboard Stats
      savedCalculations.length > 0 &&
        React.createElement(
          "div",
          { className: "dashboard-stats" },
          React.createElement(
            "div",
            { className: "stat-card" },
            React.createElement(
              "div",
              { className: "stat-header" },
              React.createElement("div", { className: "stat-title" }, "Total Calculations"),
              React.createElement("div", { className: "stat-icon" }, React.createElement(Calculator, { size: 20 })),
            ),
            React.createElement("div", { className: "stat-value" }, stats.totalCalculations),
            React.createElement(
              "div",
              { className: "stat-change positive" },
              React.createElement(TrendingUp, { size: 16 }),
              "Tracking progress",
            ),
          ),
          React.createElement(
            "div",
            { className: "stat-card" },
            React.createElement(
              "div",
              { className: "stat-header" },
              React.createElement("div", { className: "stat-title" }, "Average Emissions"),
              React.createElement("div", { className: "stat-icon" }, React.createElement(BarChart3, { size: 20 })),
            ),
            React.createElement("div", { className: "stat-value" }, `${stats.averageEmissions.toFixed(1)} kg`),
            React.createElement(
              "div",
              { className: `stat-change ${stats.lastChange < 0 ? "positive" : "negative"}` },
              stats.lastChange < 0
                ? React.createElement(TrendingUp, { size: 16 })
                : React.createElement(TrendingUp, { size: 16, style: { transform: "rotate(180deg)" } }),
              `${Math.abs(stats.lastChange).toFixed(1)}% from last`,
            ),
          ),
          React.createElement(
            "div",
            { className: "stat-card" },
            React.createElement(
              "div",
              { className: "stat-header" },
              React.createElement("div", { className: "stat-title" }, "Best Month"),
              React.createElement("div", { className: "stat-icon" }, React.createElement(Award, { size: 20 })),
            ),
            React.createElement("div", { className: "stat-value" }, `${stats.bestMonth.toFixed(1)} kg`),
            React.createElement(
              "div",
              { className: "stat-change positive" },
              React.createElement(Target, { size: 16 }),
              "Personal best",
            ),
          ),
          React.createElement(
            "div",
            { className: "stat-card" },
            React.createElement(
              "div",
              { className: "stat-header" },
              React.createElement("div", { className: "stat-title" }, "Global Impact"),
              React.createElement("div", { className: "stat-icon" }, React.createElement(Globe, { size: 20 })),
            ),
            React.createElement("div", { className: "stat-value" }, `${comparisonPercentage}%`),
            React.createElement(
              "div",
              { className: "stat-change" },
              React.createElement(Users, { size: 16 }),
              "of global average",
            ),
          ),
        ),

      // Progress Tracker
      React.createElement(
        "div",
        { className: "progress-tracker" },
        React.createElement(
          "div",
          { className: "progress-header" },
          React.createElement("h3", { className: "progress-title" }, "Assessment Progress"),
          React.createElement("span", { className: "progress-percentage" }, `${progressPercentage.toFixed(0)}%`),
        ),
        React.createElement(
          "div",
          { className: "progress-bar" },
          React.createElement("div", {
            className: "progress-fill",
            style: { width: `${progressPercentage}%` },
          }),
        ),
        React.createElement(
          "div",
          { className: "progress-steps" },
          sections.map((section, index) =>
            React.createElement(
              "div",
              {
                key: index,
                className: `progress-step ${
                  index === activeTab ? "active" : completedSections.includes(index) ? "completed" : ""
                }`,
              },
              React.createElement(
                "div",
                { className: "step-indicator" },
                completedSections.includes(index) ? "✓" : index + 1,
              ),
              React.createElement("span", null, section.name),
            ),
          ),
        ),
      ),

      // Calculator Section
      React.createElement(
        "section",
        { className: "calculator-section" },
        React.createElement(
          "div",
          { className: "calculator-header" },
          React.createElement(Calculator, { size: 24 }),
          React.createElement("h3", { className: "calculator-title" }, "Carbon Footprint Assessment"),
        ),

        React.createElement(
          "div",
          { className: "tabs-container" },
          sections.map((section, index) =>
            React.createElement(
              "button",
              {
                key: index,
                onClick: () => showSection(index),
                className: `tab-button ${
                  activeTab === index ? "active" : completedSections.includes(index) ? "completed" : ""
                }`,
              },
              section.name,
            ),
          ),
        ),

        React.createElement(
          "form",
          { onSubmit: handleSubmit },

          // Transport Section
          activeTab === 0 &&
            React.createElement(
              "div",
              { className: "form-section active" },
              React.createElement(
                "div",
                { className: "section-intro" },
                React.createElement("h3", null, "🚗 Transportation Assessment"),
                React.createElement("p", null, "Track your monthly travel patterns and transportation choices"),
              ),
              React.createElement(
                "div",
                { className: "form-grid" },
                React.createElement(
                  "div",
                  { className: "form-group" },
                  React.createElement(
                    "label",
                    { className: "form-label" },
                    React.createElement(Car, { size: 16 }),
                    "Monthly Car/Motorbike Distance (km)",
                  ),
                  React.createElement(
                    "div",
                    { className: "input-group" },
                    React.createElement("input", {
                      type: "number",
                      value: formData.carKm,
                      onChange: (e) => updateFormData("carKm", Number.parseFloat(e.target.value) || 0),
                      className: `form-input ${errors.carKm ? "error" : ""}`,
                      placeholder: "Enter kilometers driven per month",
                    }),
                  ),
                  errors.carKm && React.createElement("div", { className: "form-help error" }, errors.carKm),
                  React.createElement(
                    "div",
                    { className: "form-help" },
                    React.createElement(Info, { size: 14 }),
                    "Include all personal vehicle travel",
                  ),
                ),
                React.createElement(
                  "div",
                  { className: "form-group" },
                  React.createElement("label", { className: "form-label" }, "Monthly Bus/Public Transit Distance (km)"),
                  React.createElement("input", {
                    type: "number",
                    value: formData.busKm,
                    onChange: (e) => updateFormData("busKm", Number.parseFloat(e.target.value) || 0),
                    className: "form-input",
                    placeholder: "Enter public transport distance",
                  }),
                ),
                React.createElement(
                  "div",
                  { className: "form-group" },
                  React.createElement("label", { className: "form-label" }, "Monthly Train Distance (km)"),
                  React.createElement("input", {
                    type: "number",
                    value: formData.trainKm,
                    onChange: (e) => updateFormData("trainKm", Number.parseFloat(e.target.value) || 0),
                    className: "form-input",
                    placeholder: "Enter train travel distance",
                  }),
                ),
                React.createElement(
                  "div",
                  { className: "form-group" },
                  React.createElement(
                    "label",
                    { className: "form-label" },
                    React.createElement(Plane, { size: 16 }),
                    "Short Flights (under 3 hours) - Distance (km)",
                  ),
                  React.createElement("input", {
                    type: "number",
                    value: formData.shortFlightKm,
                    onChange: (e) => updateFormData("shortFlightKm", Number.parseFloat(e.target.value) || 0),
                    className: "form-input",
                    placeholder: "Enter short flight distance",
                  }),
                ),
                React.createElement(
                  "div",
                  { className: "form-group" },
                  React.createElement(
                    "label",
                    { className: "form-label" },
                    "Long Flights (over 3 hours) - Distance (km)",
                  ),
                  React.createElement("input", {
                    type: "number",
                    value: formData.longFlightKm,
                    onChange: (e) => updateFormData("longFlightKm", Number.parseFloat(e.target.value) || 0),
                    className: "form-input",
                    placeholder: "Enter long flight distance",
                  }),
                ),
              ),
            ),

          // Home Section
          activeTab === 1 &&
            React.createElement(
              "div",
              { className: "form-section active" },
              React.createElement(
                "div",
                { className: "section-intro" },
                React.createElement("h3", null, "🏠 Home Energy Assessment"),
                React.createElement("p", null, "Evaluate your household energy consumption and efficiency"),
              ),
              React.createElement(
                "div",
                { className: "form-grid" },
                React.createElement(
                  "div",
                  { className: "form-group" },
                  React.createElement(
                    "label",
                    { className: "form-label" },
                    React.createElement(Users, { size: 16 }),
                    "Number of People in Your Household",
                  ),
                  React.createElement("input", {
                    type: "number",
                    min: "1",
                    value: formData.householdSize,
                    onChange: (e) => updateFormData("householdSize", Number.parseFloat(e.target.value) || 1),
                    className: `form-input ${errors.householdSize ? "error" : ""}`,
                    placeholder: "Enter household size",
                  }),
                  React.createElement(
                    "div",
                    { className: "form-help" },
                    React.createElement(Info, { size: 14 }),
                    "This helps calculate per-person emissions",
                  ),
                  errors.householdSize &&
                    React.createElement("div", { className: "form-help error" }, errors.householdSize),
                ),
                React.createElement(
                  "div",
                  { className: "form-group" },
                  React.createElement(
                    "label",
                    { className: "form-label" },
                    React.createElement(Zap, { size: 16 }),
                    "Monthly Electricity Usage (kWh)",
                  ),
                  React.createElement("input", {
                    type: "number",
                    min: "0",
                    value: formData.electricityUsage,
                    onChange: (e) => updateFormData("electricityUsage", Number.parseFloat(e.target.value) || 0),
                    className: `form-input ${errors.electricityUsage ? "error" : ""}`,
                    placeholder: "Enter monthly electricity usage",
                  }),
                  React.createElement(
                    "div",
                    { className: "form-help" },
                    "Check your electricity bill for accurate data",
                  ),
                  errors.electricityUsage &&
                    React.createElement("div", { className: "form-help error" }, errors.electricityUsage),
                ),
                React.createElement(
                  "div",
                  { className: "form-group" },
                  React.createElement("label", { className: "form-label" }, "Monthly Natural Gas/Heating Usage (kWh)"),
                  React.createElement("input", {
                    type: "number",
                    min: "0",
                    value: formData.gasUsage,
                    onChange: (e) => updateFormData("gasUsage", Number.parseFloat(e.target.value) || 0),
                    className: `form-input ${errors.gasUsage ? "error" : ""}`,
                    placeholder: "Enter gas/heating usage",
                  }),
                  errors.gasUsage && React.createElement("div", { className: "form-help error" }, errors.gasUsage),
                ),
              ),
            ),

          // Food Section
          activeTab === 2 &&
            React.createElement(
              "div",
              { className: "form-section active" },
              React.createElement(
                "div",
                { className: "section-intro" },
                React.createElement("h3", null, "🍔 Food & Diet Assessment"),
                React.createElement("p", null, "Analyze your dietary choices and food waste patterns"),
              ),
              React.createElement(
                "div",
                { className: "form-grid" },
                React.createElement(
                  "div",
                  { className: "form-group" },
                  React.createElement(
                    "label",
                    { className: "form-label" },
                    React.createElement(Utensils, { size: 16 }),
                    "Your Diet Type",
                  ),
                  React.createElement(
                    "select",
                    {
                      value: formData.dietType,
                      onChange: (e) => updateFormData("dietType", e.target.value),
                      className: "form-input",
                    },
                    React.createElement(
                      "option",
                      { value: "Vegan (No animal products)" },
                      "🌱 Vegan (No animal products)",
                    ),
                    React.createElement("option", { value: "Vegetarian (No meat)" }, "🥗 Vegetarian (No meat)"),
                    React.createElement(
                      "option",
                      { value: "Omnivore (Meat & plant-based)" },
                      "🍖 Omnivore (Meat & plant-based)",
                    ),
                  ),
                ),
                React.createElement(
                  "div",
                  { className: "form-group" },
                  React.createElement(
                    "div",
                    { className: "range-group" },
                    React.createElement(
                      "div",
                      { className: "range-header" },
                      React.createElement("label", { className: "form-label" }, "Food Waste Percentage"),
                      React.createElement("span", { className: "range-value" }, `${formData.foodWastePercent}%`),
                    ),
                    React.createElement("input", {
                      type: "range",
                      min: "0",
                      max: "100",
                      value: formData.foodWastePercent,
                      onChange: (e) => updateFormData("foodWastePercent", Number.parseFloat(e.target.value)),
                      className: "form-range",
                    }),
                    React.createElement(
                      "div",
                      { className: "form-help" },
                      "Global average is 30%. Lower percentages are better for the environment.",
                    ),
                  ),
                ),
              ),
            ),

          // Waste Section
          activeTab === 3 &&
            React.createElement(
              "div",
              { className: "form-section active" },
              React.createElement(
                "div",
                { className: "section-intro" },
                React.createElement("h3", null, "🗑 Waste Management Assessment"),
                React.createElement("p", null, "Evaluate your waste generation and recycling habits"),
              ),
              React.createElement(
                "div",
                { className: "form-grid" },
                React.createElement(
                  "div",
                  { className: "form-group" },
                  React.createElement(
                    "label",
                    { className: "form-label" },
                    React.createElement(Recycle, { size: 16 }),
                    "Monthly Household Waste (kg)",
                  ),
                  React.createElement("input", {
                    type: "number",
                    min: "0",
                    value: formData.wasteAmount,
                    onChange: (e) => updateFormData("wasteAmount", Number.parseFloat(e.target.value) || 0),
                    className: "form-input",
                    placeholder: "Enter monthly waste amount",
                  }),
                  React.createElement(
                    "div",
                    { className: "form-help" },
                    "Average household generates 15-20kg per person monthly",
                  ),
                ),
                React.createElement(
                  "div",
                  { className: "form-group" },
                  React.createElement(
                    "div",
                    { className: "range-group" },
                    React.createElement(
                      "div",
                      { className: "range-header" },
                      React.createElement("label", { className: "form-label" }, "Recycling Rate"),
                      React.createElement("span", { className: "range-value" }, `${formData.recyclingRate}%`),
                    ),
                    React.createElement("input", {
                      type: "range",
                      min: "0",
                      max: "100",
                      value: formData.recyclingRate,
                      onChange: (e) => updateFormData("recyclingRate", Number.parseFloat(e.target.value)),
                      className: "form-range",
                    }),
                    React.createElement(
                      "div",
                      { className: "form-help" },
                      "Higher recycling rates significantly reduce emissions",
                    ),
                  ),
                ),
              ),
            ),

          React.createElement(
            "div",
            { className: "form-navigation" },
            React.createElement(
              "button",
              {
                type: "button",
                onClick: prevSection,
                disabled: activeTab === 0,
                className: "nav-button prev",
              },
              "← Previous",
            ),
            activeTab < sections.length - 1
              ? React.createElement(
                  "button",
                  {
                    type: "button",
                    onClick: nextSection,
                    className: "nav-button next",
                  },
                  "Next →",
                )
              : React.createElement(
                  "button",
                  {
                    type: "submit",
                    className: "nav-button calculate",
                  },
                  React.createElement(Calculator, { size: 16 }),
                  "Calculate Footprint",
                ),
          ),
        ),
      ),

      // Results Section
      showResults &&
        React.createElement(
          "section",
          {
            id: "results-section",
            className: "results-section show",
          },
          React.createElement(
            "div",
            { className: "results-header" },
            React.createElement("h2", { className: "results-title" }, "🌍 Your Carbon Footprint Report"),
            React.createElement(
              "div",
              { className: "action-buttons" },
              React.createElement(
                "button",
                {
                  onClick: generatePDF,
                  disabled: isGeneratingPDF,
                  className: "action-button primary",
                },
                React.createElement(Download, { size: 16 }),
                isGeneratingPDF ? "Generating..." : "Download PDF",
              ),
              React.createElement(
                "button",
                {
                  onClick: shareResults,
                  className: "action-button secondary",
                },
                React.createElement(Share2, { size: 16 }),
                "Share Results",
              ),
              React.createElement(
                "button",
                {
                  onClick: saveCalculation,
                  className: "action-button tertiary",
                },
                React.createElement(Save, { size: 16 }),
                "Save Calculation",
              ),
            ),
          ),

          React.createElement(
            "div",
            { className: "charts-grid" },
            React.createElement(
              "div",
              { className: "chart-container" },
              React.createElement(
                "h3",
                { className: "chart-title" },
                React.createElement(BarChart3, { size: 20 }),
                "Category-wise Emissions",
              ),
              React.createElement(
                "div",
                { className: "chart-canvas" },
                React.createElement("canvas", { ref: barChartRef }),
              ),
            ),
            React.createElement(
              "div",
              { className: "chart-container" },
              React.createElement(
                "h3",
                { className: "chart-title" },
                React.createElement(PieChart, { size: 20 }),
                "Emission Breakdown",
              ),
              React.createElement(
                "div",
                { className: "chart-canvas" },
                React.createElement("canvas", { ref: pieChartRef }),
              ),
            ),
          ),

          React.createElement(
            "div",
            { className: "summary-grid" },
            React.createElement(
              "div",
              { className: "summary-card primary" },
              React.createElement("h4", { className: "summary-card-title" }, "📊 Monthly Summary"),
              React.createElement(
                "p",
                { className: "summary-card-value" },
                `${calculatedEmissions.totalEmissions.toFixed(2)} kg CO₂`,
              ),
              React.createElement("p", { className: "summary-card-label" }, "Total monthly emissions"),
            ),
            React.createElement(
              "div",
              { className: "summary-card success" },
              React.createElement("h4", { className: "summary-card-title" }, "📅 Annual Estimate"),
              React.createElement(
                "p",
                { className: "summary-card-value" },
                `${(calculatedEmissions.totalEmissions * 12).toFixed(2)} kg CO₂`,
              ),
              React.createElement("p", { className: "summary-card-label" }, "Projected yearly emissions"),
            ),
            React.createElement(
              "div",
              { className: "summary-card warning" },
              React.createElement("h4", { className: "summary-card-title" }, "🌍 Global Comparison"),
              React.createElement("p", { className: "summary-card-value" }, `${comparisonPercentage}%`),
              React.createElement("p", { className: "summary-card-label" }, "of global average"),
            ),
          ),

          // Comparison Section
          React.createElement(
            "div",
            { className: "comparison-section" },
            React.createElement(
              "h3",
              { className: "comparison-title" },
              React.createElement(Globe, { size: 24 }),
              "Global Impact Comparison",
            ),
            React.createElement(
              "div",
              { className: "comparison-grid" },
              React.createElement(
                "div",
                { className: "comparison-item" },
                React.createElement("div", { className: "comparison-value" }, "333 kg"),
                React.createElement("div", { className: "comparison-label" }, "Global Average/Month"),
              ),
              React.createElement(
                "div",
                { className: "comparison-item" },
                React.createElement(
                  "div",
                  { className: "comparison-value" },
                  `${calculatedEmissions.totalEmissions.toFixed(0)} kg`,
                ),
                React.createElement("div", { className: "comparison-label" }, "Your Monthly Emissions"),
              ),
              React.createElement(
                "div",
                { className: "comparison-item" },
                React.createElement(
                  "div",
                  { className: "comparison-value" },
                  calculatedEmissions.totalEmissions < globalAverageMonthly ? "👍" : "⚠️",
                ),
                React.createElement(
                  "div",
                  { className: "comparison-label" },
                  calculatedEmissions.totalEmissions < globalAverageMonthly ? "Below Average" : "Above Average",
                ),
              ),
              React.createElement(
                "div",
                { className: "comparison-item" },
                React.createElement(
                  "div",
                  { className: "comparison-value" },
                  `${((calculatedEmissions.totalEmissions * 12) / 1000).toFixed(1)}t`,
                ),
                React.createElement("div", { className: "comparison-label" }, "Annual CO₂ Tons"),
              ),
            ),
          ),

          React.createElement(
            "div",
            { className: "tips-section" },
            React.createElement(
              "h3",
              { className: "tips-title" },
              React.createElement(Leaf, { size: 24 }),
              "Personalized Action Plan",
            ),
            React.createElement(
              "div",
              { className: "tips-grid" },
              getPersonalizedTips(calculatedEmissions).map((tip, index) =>
                React.createElement("div", { key: index, className: "tip-item" }, tip),
              ),
            ),
          ),
        ),
    ),
  )
}

// Initialize the app
document.addEventListener("DOMContentLoaded", () => {
  ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(CarbonFootprintCalculator))
})
