'use client'

import { useState, useEffect } from 'react'
import { db } from '../../../lib/firebase'
import { collection, getDocs } from 'firebase/firestore'

export default function DebugPage() {
  const [collections, setCollections] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    debugFirebaseData()
  }, [])

  const debugFirebaseData = async () => {
    try {
      const collectionsToCheck = ['users', 'sellers', 'buyers', 'orders', 'restaurants', 'customers']
      const results = {}

      for (const collectionName of collectionsToCheck) {
        try {
          console.log(`Checking collection: ${collectionName}`)
          const collectionRef = collection(db, collectionName)
          const snapshot = await getDocs(collectionRef)
          
          results[collectionName] = {
            exists: true,
            count: snapshot.size,
            sampleDocs: []
          }

          // Get first 3 documents as samples
          let count = 0
          snapshot.forEach((doc) => {
            if (count < 3) {
              results[collectionName].sampleDocs.push({
                id: doc.id,
                data: doc.data()
              })
              count++
            }
          })

          console.log(`Collection ${collectionName}:`, results[collectionName])
        } catch (error) {
          console.log(`Collection ${collectionName} doesn't exist or error:`, error)
          results[collectionName] = {
            exists: false,
            error: error.message
          }
        }
      }

      setCollections(results)
      setLoading(false)
    } catch (error) {
      console.error('Debug error:', error)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Debugging Firebase Collections...</h1>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#711330]"></div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Firebase Collections Debug</h1>
      
      <div className="space-y-6">
        {Object.entries(collections).map(([collectionName, data]) => (
          <div key={collectionName} className="bg-white border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              Collection: <code className="ml-2 bg-gray-100 px-2 py-1 rounded">{collectionName}</code>
              <span className={`ml-2 px-2 py-1 rounded text-sm ${
                data.exists ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {data.exists ? `${data.count} documents` : 'Not found'}
              </span>
            </h2>
            
            {data.exists ? (
              <div>
                {data.sampleDocs.length > 0 ? (
                  <div>
                    <h3 className="font-medium mb-2">Sample Documents:</h3>
                    <div className="space-y-4">
                      {data.sampleDocs.map((doc, index) => (
                        <div key={index} className="bg-gray-50 p-4 rounded">
                          <p className="font-mono text-sm text-gray-600 mb-2">ID: {doc.id}</p>
                          <pre className="text-xs bg-gray-800 text-green-400 p-3 rounded overflow-auto">
                            {JSON.stringify(doc.data, null, 2)}
                          </pre>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">Collection exists but no documents found</p>
                )}
              </div>
            ) : (
              <p className="text-red-600">
                Error: {data.error || 'Collection does not exist'}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-2">What to look for:</h3>
        <ul className="text-blue-800 space-y-1 text-sm">
          <li>• <strong>Collection names:</strong> users, sellers, buyers, restaurants, customers</li>
          <li>• <strong>User roles:</strong> Look for fields like &apos;role&apos;, &apos;userType&apos;, &apos;type&apos;</li>
          <li>• <strong>Seller indicators:</strong> &apos;isSeller&apos;, &apos;businessName&apos;, &apos;restaurant&apos;</li>
          <li>• <strong>Buyer indicators:</strong> &apos;isBuyer&apos;, &apos;customer&apos;, no role field</li>
          <li>• <strong>Date fields:</strong> &apos;createdAt&apos;, &apos;created_at&apos;, &apos;dateCreated&apos;</li>
        </ul>
      </div>
    </div>
  )
}
