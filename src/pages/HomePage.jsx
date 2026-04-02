import Hero from '../components/Hero'
import QueryInterface from '../components/QueryInterface'
import Features from '../components/Features'
import AdvancedFeatures from '../components/AdvancedFeatures'
import ResponseSection from '../components/ResponseSection'

const HomePage = () => {
  return (
    <div>
      <Hero />
      <QueryInterface />
      <Features />
      <AdvancedFeatures />
      <ResponseSection />
    </div>
  )
}

export default HomePage