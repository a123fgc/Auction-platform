import { Routes, Route } from "react-router-dom";
import Login from "../pages/public/Login";
import Signup from "../pages/public/Signup";
import NotFound from "../pages/public/NotFound";
import Browse from "../pages/buyer/Browse";
import AuctionDetail from "../pages/buyer/AuctionDetail";
import MyBids from "../pages/buyer/MyBids";
import MyAuctions from "../pages/seller/MyAuctions";
import CreateAuction from "../pages/seller/CreateAuction";
import EditAuction from "../pages/seller/EditAuction";
import Dashboard from "../pages/admin/Dashboard";
import AdminUsers from "../pages/admin/Users";
import AdminAuctions from "../pages/admin/Auctions";
import ProtectedRoute from "../components/guards/ProtectedRoute";
import Settings from "../pages/settings/Settings";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Browse />} />
      <Route path="/browse" element={<Browse />} />
      <Route path="/auctions/:id" element={<AuctionDetail />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      <Route element={<ProtectedRoute roles={["buyer", "admin"]} />}>
        <Route path="/my-bids" element={<MyBids />} />
      </Route>

      <Route element={<ProtectedRoute roles={["seller", "admin"]} />}>
        <Route path="/seller/auctions" element={<MyAuctions />} />
        <Route path="/seller/auctions/new" element={<CreateAuction />} />
        <Route path="/seller/auctions/:id/edit" element={<EditAuction />} />
      </Route>

      <Route element={<ProtectedRoute roles={["admin"]} />}>
        <Route path="/admin" element={<Dashboard />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/auctions" element={<AdminAuctions />} />
      </Route>

      <Route path="*" element={<NotFound />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
