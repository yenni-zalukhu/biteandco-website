'use client'

import { useState, useEffect } from 'react'

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    general: {
      siteName: 'Bite&Co',
      siteDescription: 'Your favorite food delivery platform',
      supportEmail: 'support@biteandco.com',
      maintenanceMode: false,
      allowNewRegistrations: true
    },
    notifications: {
      emailNotifications: true,
      smsNotifications: false,
      pushNotifications: true,
      orderUpdates: true,
      sellerApprovals: true,
      systemAlerts: true
    },
    payment: {
      commissionRate: 10,
      minimumOrderAmount: 25000,
      paymentMethods: ['OVO', 'GoPay', 'Dana', 'Shopee Pay', 'Bank Transfer'],
      autoApprovePayments: false
    },
    delivery: {
      defaultDeliveryFee: 5000,
      freeDeliveryMinimum: 100000,
      deliveryRadius: 10,
      estimatedDeliveryTime: 60
    },
    security: {
      twoFactorAuth: false,
      sessionTimeout: 30,
      passwordPolicy: 'medium',
      apiRateLimit: 1000
    }
  })

  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSettingChange = (category, key, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }))
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      // In a real application, save to database/API
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (error) {
      console.error('Error saving settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const SettingsSection = ({ title, children }) => (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">{title}</h3>
        {children}
      </div>
    </div>
  )

  const ToggleSwitch = ({ enabled, onChange, label, description }) => (
    <div className="flex items-center justify-between">
      <div>
        <label className="text-sm font-medium text-gray-900">{label}</label>
        {description && <p className="text-sm text-gray-500">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!enabled)}
        className={`${
          enabled ? 'bg-[#711330]' : 'bg-gray-200'
        } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#711330] focus:ring-offset-2`}
      >
        <span
          className={`${
            enabled ? 'translate-x-5' : 'translate-x-0'
          } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
        />
      </button>
    </div>
  )

  const InputField = ({ label, value, onChange, type = 'text', placeholder }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#711330] focus:ring-[#711330] sm:text-sm"
      />
    </div>
  )

  const SelectField = ({ label, value, onChange, options }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#711330] focus:ring-[#711330] sm:text-sm"
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage your platform configuration and preferences.
            </p>
          </div>
          <div className="flex space-x-3">
            {saved && (
              <div className="flex items-center text-green-600">
                <svg className="h-5 w-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Settings saved
              </div>
            )}
            <button
              onClick={handleSave}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#711330] hover:bg-[#8b1538] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#711330] disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {/* General Settings */}
        <SettingsSection title="General Settings">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <InputField
              label="Site Name"
              value={settings.general.siteName}
              onChange={(value) => handleSettingChange('general', 'siteName', value)}
            />
            <InputField
              label="Support Email"
              value={settings.general.supportEmail}
              onChange={(value) => handleSettingChange('general', 'supportEmail', value)}
              type="email"
            />
          </div>
          <div className="mt-6">
            <InputField
              label="Site Description"
              value={settings.general.siteDescription}
              onChange={(value) => handleSettingChange('general', 'siteDescription', value)}
            />
          </div>
          <div className="mt-6 space-y-4">
            <ToggleSwitch
              enabled={settings.general.maintenanceMode}
              onChange={(value) => handleSettingChange('general', 'maintenanceMode', value)}
              label="Maintenance Mode"
              description="Enable this to put the platform in maintenance mode"
            />
            <ToggleSwitch
              enabled={settings.general.allowNewRegistrations}
              onChange={(value) => handleSettingChange('general', 'allowNewRegistrations', value)}
              label="Allow New Registrations"
              description="Allow new users to register on the platform"
            />
          </div>
        </SettingsSection>

        {/* Notification Settings */}
        <SettingsSection title="Notification Settings">
          <div className="space-y-4">
            <ToggleSwitch
              enabled={settings.notifications.emailNotifications}
              onChange={(value) => handleSettingChange('notifications', 'emailNotifications', value)}
              label="Email Notifications"
              description="Send notifications via email"
            />
            <ToggleSwitch
              enabled={settings.notifications.smsNotifications}
              onChange={(value) => handleSettingChange('notifications', 'smsNotifications', value)}
              label="SMS Notifications"
              description="Send notifications via SMS"
            />
            <ToggleSwitch
              enabled={settings.notifications.pushNotifications}
              onChange={(value) => handleSettingChange('notifications', 'pushNotifications', value)}
              label="Push Notifications"
              description="Send push notifications to mobile apps"
            />
            <ToggleSwitch
              enabled={settings.notifications.orderUpdates}
              onChange={(value) => handleSettingChange('notifications', 'orderUpdates', value)}
              label="Order Updates"
              description="Notify users about order status changes"
            />
            <ToggleSwitch
              enabled={settings.notifications.sellerApprovals}
              onChange={(value) => handleSettingChange('notifications', 'sellerApprovals', value)}
              label="Seller Approvals"
              description="Notify admins about pending seller approvals"
            />
            <ToggleSwitch
              enabled={settings.notifications.systemAlerts}
              onChange={(value) => handleSettingChange('notifications', 'systemAlerts', value)}
              label="System Alerts"
              description="Notify admins about system issues"
            />
          </div>
        </SettingsSection>

        {/* Payment Settings */}
        <SettingsSection title="Payment Settings">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <InputField
              label="Commission Rate (%)"
              value={settings.payment.commissionRate}
              onChange={(value) => handleSettingChange('payment', 'commissionRate', parseFloat(value) || 0)}
              type="number"
            />
            <InputField
              label="Minimum Order Amount (Rp)"
              value={settings.payment.minimumOrderAmount}
              onChange={(value) => handleSettingChange('payment', 'minimumOrderAmount', parseInt(value) || 0)}
              type="number"
            />
          </div>
          <div className="mt-6">
            <ToggleSwitch
              enabled={settings.payment.autoApprovePayments}
              onChange={(value) => handleSettingChange('payment', 'autoApprovePayments', value)}
              label="Auto-approve Payments"
              description="Automatically approve payments without manual review"
            />
          </div>
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Methods</label>
            <div className="space-y-2">
              {['OVO', 'GoPay', 'Dana', 'Shopee Pay', 'Bank Transfer', 'Credit Card'].map((method) => (
                <div key={method} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.payment.paymentMethods.includes(method)}
                    onChange={(e) => {
                      const methods = e.target.checked
                        ? [...settings.payment.paymentMethods, method]
                        : settings.payment.paymentMethods.filter(m => m !== method)
                      handleSettingChange('payment', 'paymentMethods', methods)
                    }}
                    className="h-4 w-4 text-[#711330] focus:ring-[#711330] border-gray-300 rounded"
                  />
                  <label className="ml-2 text-sm text-gray-700">{method}</label>
                </div>
              ))}
            </div>
          </div>
        </SettingsSection>

        {/* Delivery Settings */}
        <SettingsSection title="Delivery Settings">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <InputField
              label="Default Delivery Fee (Rp)"
              value={settings.delivery.defaultDeliveryFee}
              onChange={(value) => handleSettingChange('delivery', 'defaultDeliveryFee', parseInt(value) || 0)}
              type="number"
            />
            <InputField
              label="Free Delivery Minimum (Rp)"
              value={settings.delivery.freeDeliveryMinimum}
              onChange={(value) => handleSettingChange('delivery', 'freeDeliveryMinimum', parseInt(value) || 0)}
              type="number"
            />
            <InputField
              label="Delivery Radius (km)"
              value={settings.delivery.deliveryRadius}
              onChange={(value) => handleSettingChange('delivery', 'deliveryRadius', parseInt(value) || 0)}
              type="number"
            />
            <InputField
              label="Estimated Delivery Time (minutes)"
              value={settings.delivery.estimatedDeliveryTime}
              onChange={(value) => handleSettingChange('delivery', 'estimatedDeliveryTime', parseInt(value) || 0)}
              type="number"
            />
          </div>
        </SettingsSection>

        {/* Security Settings */}
        <SettingsSection title="Security Settings">
          <div className="space-y-6">
            <ToggleSwitch
              enabled={settings.security.twoFactorAuth}
              onChange={(value) => handleSettingChange('security', 'twoFactorAuth', value)}
              label="Two-Factor Authentication"
              description="Enable 2FA for admin accounts"
            />
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <InputField
                label="Session Timeout (minutes)"
                value={settings.security.sessionTimeout}
                onChange={(value) => handleSettingChange('security', 'sessionTimeout', parseInt(value) || 0)}
                type="number"
              />
              <SelectField
                label="Password Policy"
                value={settings.security.passwordPolicy}
                onChange={(value) => handleSettingChange('security', 'passwordPolicy', value)}
                options={[
                  { value: 'low', label: 'Low - 6 characters minimum' },
                  { value: 'medium', label: 'Medium - 8 characters, mixed case' },
                  { value: 'high', label: 'High - 12 characters, mixed case, numbers, symbols' }
                ]}
              />
            </div>
            <InputField
              label="API Rate Limit (requests per hour)"
              value={settings.security.apiRateLimit}
              onChange={(value) => handleSettingChange('security', 'apiRateLimit', parseInt(value) || 0)}
              type="number"
            />
          </div>
        </SettingsSection>

        {/* System Information */}
        <SettingsSection title="System Information">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Platform Version</dt>
              <dd className="mt-1 text-sm text-gray-900">v2.1.0</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Database Status</dt>
              <dd className="mt-1 text-sm text-green-600">● Connected</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Cache Status</dt>
              <dd className="mt-1 text-sm text-green-600">● Active</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Last Backup</dt>
              <dd className="mt-1 text-sm text-gray-900">2 hours ago</dd>
            </div>
          </div>
          <div className="mt-6 flex space-x-3">
            <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#711330]">
              Clear Cache
            </button>
            <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#711330]">
              Create Backup
            </button>
            <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#711330]">
              View Logs
            </button>
          </div>
        </SettingsSection>
      </div>
    </div>
  )
}
