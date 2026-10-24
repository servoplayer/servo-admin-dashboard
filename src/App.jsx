import Login from './components/Login/Login'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Customers from './components/Customers/Customers'
import Layout from './components/Layout/Layout'
import Reseller from './components/Reseller/Reseller'
import Settings from './components/Settings/Settings'
import EditContent from './components/EditContent/EditContent'
import { ToastContainer } from 'react-toastify';
import ProtectedRoutes from './components/ProtectedRoutes/ProtectedRoutes'
import ProviderCustomer from './components/ProviderCustomer/ProviderCustomer'
import Activation from './components/Activation/Activation'
import Overview from './components/Overview/Overview'
import ResellerDetail, { LegacyResellerCustomerRedirect } from './components/ResellerDetail/ResellerDetail'
import DeviceLookup from './components/DeviceLookup/DeviceLookup'

const routes = createBrowserRouter([

  {
    path: "/",
    element:
      <ProtectedRoutes>
        <Login />
      </ProtectedRoutes>,
  },
  {
    path: "/layout",
    element:
      <ProtectedRoutes>
        <Layout />
      </ProtectedRoutes>,
    children: [
      {
        index: true,
        element:
          <ProtectedRoutes>
            <Overview />
          </ProtectedRoutes>,
      },
      {
        path: "customer",
        element:
          <ProtectedRoutes>
            <Customers />
          </ProtectedRoutes>,
      },
      {
        path: "editContent",
        element:
          <ProtectedRoutes>
            <EditContent />
          </ProtectedRoutes>,
      },
      {
        path: "reseller",
        element:
          <ProtectedRoutes>
            <Reseller />
          </ProtectedRoutes>,
      },
      {
        path: "activation",
        element:
          <ProtectedRoutes>
            <Activation />
          </ProtectedRoutes>,
      },
      {
        path: "setting",
        element:
          <ProtectedRoutes>
            <Settings />
          </ProtectedRoutes>
      },
      {
        path: "reseller/:id",
        element:
          <ProtectedRoutes>
            <ResellerDetail />
          </ProtectedRoutes>
      },
      {
        path: "reseller/resellerCustomer/:id",
        element:
          <ProtectedRoutes>
            <LegacyResellerCustomerRedirect />
          </ProtectedRoutes>
      },
      {
        path: "device-lookup",
        element:
          <ProtectedRoutes>
            <DeviceLookup />
          </ProtectedRoutes>
      },
      {
        path: "providerCustomer",
        element:
          <ProtectedRoutes>
            <ProviderCustomer />
          </ProtectedRoutes>
      },
    ]
  },

])

function App() {
  return (
    <>
      <RouterProvider router={routes} />
      <ToastContainer
        position="top-right"
        autoClose={4000}
        limit={4}
        newestOnTop
        closeOnClick={false}
        pauseOnFocusLoss={false}
        theme="light"
      />
    </>
  )
}

export default App
