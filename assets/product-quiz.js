class ProductQuiz extends HTMLElement {
  constructor () {
    super()
    this.quizData = {
      answers: [],
      currentQuestion: 1,
      totalQuestions: this.querySelectorAll('.quiz-question').length
    }

    this.productCollectionHandle = this.dataset.productCollection
    this.sectionId = this.dataset.sectionId

    // DOM elements
    this.quizQuestions = this.querySelectorAll('.quiz-question')
    this.quizResults = this.querySelector('.quiz-results')
    this.resultsProductsGrid = this.querySelector('.recommended-products-grid')
    this.loadingSpinner = this.querySelector('.loading-spinner')
    this.productTemplate = document.getElementById(
      'product-recommendation-template'
    )

    this.initEventListeners()
  }

  initEventListeners () {
    // Option selection
    const options = this.querySelectorAll('.quiz-option')
    options.forEach(option => {
      option.addEventListener('click', this.handleOptionClick.bind(this))
    })

    // Navigation buttons
    const nextButtons = this.querySelectorAll('.next-question')
    nextButtons.forEach(button => {
      button.addEventListener('click', this.nextQuestion.bind(this))
    })

    const prevButtons = this.querySelectorAll('.prev-question')
    prevButtons.forEach(button => {
      button.addEventListener('click', this.prevQuestion.bind(this))
    })

    // Results button
    const resultsButtons = this.querySelectorAll('.see-results-button')
    resultsButtons.forEach(button => {
      button.addEventListener('click', this.showResults.bind(this))
    })

    // Restart button
    const restartButton = this.querySelector('.restart-quiz-button')
    if (restartButton) {
      restartButton.addEventListener('click', this.restartQuiz.bind(this))
    }
  }

  handleOptionClick (event) {
    const currentQuestionElement = this.querySelector(
      `#question-${this.quizData.currentQuestion}`
    )
    const clickedOption = event.currentTarget
    const questionIndex = parseInt(currentQuestionElement.dataset.questionIndex)

    // Remove selected class from all options in this question
    currentQuestionElement.querySelectorAll('.quiz-option').forEach(option => {
      option.classList.remove('selected')
    })

    // Add selected class to clicked option
    clickedOption.classList.add('selected')

    // Store the answer
    this.quizData.answers[questionIndex - 1] = {
      option: clickedOption.dataset.option,
      value: clickedOption.dataset.value
    }

    // Enable next/results button
    const nextButton = currentQuestionElement.querySelector('.next-question')
    const resultsButton = currentQuestionElement.querySelector(
      '.see-results-button'
    )

    if (nextButton) {
      nextButton.disabled = false
    }

    if (resultsButton) {
      resultsButton.disabled = false
    }
  }

  nextQuestion () {
    if (this.quizData.currentQuestion < this.quizData.totalQuestions) {
      // Hide current question
      this.querySelector(
        `#question-${this.quizData.currentQuestion}`
      ).style.display = 'none'

      // Show next question
      this.quizData.currentQuestion++
      this.querySelector(
        `#question-${this.quizData.currentQuestion}`
      ).style.display = 'flex'

      // If we've previously answered this question, highlight the selected option
      this.highlightSelectedOption()

      // Scroll to top of quiz if needed
      this.scrollToQuizTop()
    }
  }

  prevQuestion () {
    if (this.quizData.currentQuestion > 1) {
      // Hide current question
      this.querySelector(
        `#question-${this.quizData.currentQuestion}`
      ).style.display = 'none'

      // Show previous question
      this.quizData.currentQuestion--
      this.querySelector(
        `#question-${this.quizData.currentQuestion}`
      ).style.display = 'flex'

      // Highlight the previously selected option
      this.highlightSelectedOption()

      // Scroll to top of quiz if needed
      this.scrollToQuizTop()
    }
  }

  highlightSelectedOption () {
    const currentQuestionElement = this.querySelector(
      `#question-${this.quizData.currentQuestion}`
    )
    const questionIndex = parseInt(currentQuestionElement.dataset.questionIndex)
    const previousAnswer = this.quizData.answers[questionIndex - 1]

    if (previousAnswer) {
      const selectedOption = currentQuestionElement.querySelector(
        `.quiz-option[data-option="${previousAnswer.option}"]`
      )
      if (selectedOption) {
        selectedOption.classList.add('selected')
      }
    }
  }

  scrollToQuizTop () {
    const quizTop = this.getBoundingClientRect().top + window.scrollY
    window.scrollTo({
      top: quizTop - 100,
      behavior: 'smooth'
    })
  }

  showResults () {
    // Hide all questions
    this.quizQuestions.forEach(question => {
      question.style.display = 'none'
    })

    // Show results section
    this.quizResults.style.display = 'block'

    // Show loading spinner
    this.loadingSpinner.style.display = 'block'

    // Fetch recommended products
    this.fetchRecommendedProducts()
      .then(products => {
        // Hide loading spinner
        this.loadingSpinner.style.display = 'none'

        // Display products
        this.displayRecommendedProducts(products)
      })
      .catch(error => {
        console.error('Error fetching recommended products:', error)
        this.loadingSpinner.style.display = 'none'
        this.resultsProductsGrid.innerHTML =
          "<p>Sorry, we couldn't load the recommended products. Please try again later.</p>"
      })

    // Scroll to top of results
    this.scrollToQuizTop()
  }

  async fetchRecommendedProducts () {
    if (!this.productCollectionHandle) {
      return []
    }

    try {
      // Get the collection products
      const response = await fetch(
        `/collections/${this.productCollectionHandle}?view=ajax`
      )
      const html = await response.text()
      const parser = new DOMParser()
      const doc = parser.parseFromString(html, 'text/html')
      const productElements = doc.querySelectorAll('.product-card')

      // Extract product data
      const allProducts = Array.from(productElements).map(element => {
        const productUrl = element.querySelector('a').getAttribute('href')
        const productId = productUrl.split('products/')[1]
        const title = element
          .querySelector('.card__heading')
          ?.textContent.trim()
        const image = element.querySelector('.card__media img')?.src
        const price = element.querySelector('.price')?.textContent.trim()
        const rating =
          element.querySelector('.rating')?.textContent.trim() || ''

        // Extract product tags for matching
        const tags = Array.from(
          element.querySelectorAll('.card-tags .card-tag')
        ).map(tag => tag.textContent.trim().toLowerCase())

        return {
          id: productId,
          title,
          image,
          price,
          rating,
          url: productUrl,
          tags,
          score: 0 // For ranking
        }
      })

      // Score and rank products based on quiz answers
      return this.rankProducts(allProducts)
    } catch (error) {
      console.error('Error fetching products', error)
      return []
    }
  }

  rankProducts (products) {
    // Calculate score for each product based on matching quiz answers
    products.forEach(product => {
      this.quizData.answers.forEach(answer => {
        if (product.tags.includes(answer.value.toLowerCase())) {
          product.score += 1
        }
      })
    })

    // Sort by score (highest first)
    products.sort((a, b) => b.score - a.score)

    // Return top 3 products (or fewer if less than 3 available)
    return products.slice(0, 3)
  }

  displayRecommendedProducts (products) {
    if (!products || products.length === 0) {
      this.resultsProductsGrid.innerHTML =
        '<p>No products match your preferences. Please try different options.</p>'
      return
    }

    // Clear previous results
    this.resultsProductsGrid.innerHTML = ''

    // Create product cards
    products.forEach((product, index) => {
      const productElement = this.productTemplate.content.cloneNode(true)

      // Set product details
      productElement.querySelector('.product-image').src = product.image
      productElement.querySelector('.product-image').alt = product.title
      productElement.querySelector(
        '.product-recommendation-title'
      ).textContent = product.title

      if (product.rating) {
        const ratingElement = productElement.querySelector(
          '.product-recommendation-rating'
        )
        const ratingValue = parseFloat(product.rating)
        const stars =
          '★'.repeat(Math.floor(ratingValue)) +
          '☆'.repeat(5 - Math.floor(ratingValue))
        ratingElement.innerHTML = `<span class="stars">${stars}</span> ${ratingValue}`
      }

      productElement.querySelector(
        '.product-recommendation-price'
      ).textContent = product.price

      // Add reason text
      const reasonElement = productElement.querySelector(
        '.product-recommendation-reason'
      )
      if (index === 0) {
        reasonElement.textContent =
          'Top Pick: Perfect match for your preferences'
      } else if (index === 1) {
        reasonElement.textContent = 'Great alternative with balanced features'
      } else {
        reasonElement.textContent = 'Also matches your requirements'
      }

      // Set product link
      const linkElement = productElement.querySelector(
        '.product-recommendation-link'
      )
      linkElement.href = product.url

      // Add to results grid
      this.resultsProductsGrid.appendChild(productElement)
    })
  }

  restartQuiz () {
    // Reset quiz data
    this.quizData.answers = []
    this.quizData.currentQuestion = 1

    // Hide results
    this.quizResults.style.display = 'none'

    // Clear selected options
    this.querySelectorAll('.quiz-option').forEach(option => {
      option.classList.remove('selected')
    })

    // Disable next/results buttons
    this.querySelectorAll('.next-question, .see-results-button').forEach(
      button => {
        button.disabled = true
      }
    )

    // Show first question
    this.quizQuestions.forEach((question, index) => {
      question.style.display = index === 0 ? 'flex' : 'none'
    })

    // Scroll to top of quiz
    this.scrollToQuizTop()
  }
}

// Define the custom element
customElements.define('product-quiz', ProductQuiz)

// Initialize quiz when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
  const quizElements = document.querySelectorAll('#product-quiz')
  quizElements.forEach(quiz => {
    if (quiz instanceof ProductQuiz) {
      // Already initialized
    } else {
      Object.setPrototypeOf(quiz, ProductQuiz.prototype)
      ProductQuiz.call(quiz)
    }
  })
})
