import requests
import sys
import json
from datetime import datetime
import os

class PhotoGalleryAPITester:
    def __init__(self, base_url="https://liquid-portfolios.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}" if not endpoint.startswith('http') else endpoint
        
        # Default headers
        test_headers = {'Content-Type': 'application/json'}
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        # Override with custom headers if provided
        if headers:
            test_headers.update(headers)
        
        # Remove Content-Type for file uploads
        if files:
            test_headers.pop('Content-Type', None)

        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                if files:
                    response = requests.post(url, data=data, files=files, headers=test_headers)
                else:
                    response = requests.post(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            
            if success:
                self.log_test(name, True)
                try:
                    return True, response.json() if response.content else {}
                except:
                    return True, {}
            else:
                error_msg = f"Expected {expected_status}, got {response.status_code}"
                try:
                    error_detail = response.json()
                    error_msg += f" - {error_detail}"
                except:
                    error_msg += f" - {response.text[:200]}"
                
                self.log_test(name, False, error_msg)
                return False, {}

        except Exception as e:
            self.log_test(name, False, f"Request failed: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test API root endpoint"""
        return self.run_test("API Root", "GET", "", 200)

    def test_admin_check(self):
        """Check if admin exists"""
        success, response = self.run_test("Admin Check", "GET", "admin/check", 200)
        if success:
            print(f"   Admin exists: {response.get('exists', False)}")
        return success, response

    def test_admin_setup(self, username="admin", password="admin123"):
        """Test admin setup (only works if no admin exists)"""
        success, response = self.run_test(
            "Admin Setup",
            "POST",
            "admin/setup",
            200,
            data={"username": username, "password": password}
        )
        if success and 'token' in response:
            self.token = response['token']
            print(f"   Admin created and token obtained")
        return success, response

    def test_admin_login(self, username="admin", password="admin123"):
        """Test admin login"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "admin/login",
            200,
            data={"username": username, "password": password}
        )
        if success and 'token' in response:
            self.token = response['token']
            print(f"   Login successful, token obtained")
        return success, response

    def test_admin_verify(self):
        """Test admin token verification"""
        if not self.token:
            self.log_test("Admin Verify", False, "No token available")
            return False, {}
        
        return self.run_test("Admin Verify", "GET", "admin/verify", 200)

    def test_get_themes(self):
        """Test getting themes"""
        success, response = self.run_test("Get Themes", "GET", "themes", 200)
        if success:
            themes = response if isinstance(response, list) else []
            print(f"   Found {len(themes)} themes")
            for theme in themes[:3]:  # Show first 3 themes
                print(f"   - {theme.get('name', 'Unknown')}: {theme.get('slug', 'no-slug')}")
        return success, response

    def test_get_photos(self):
        """Test getting all photos"""
        success, response = self.run_test("Get All Photos", "GET", "photos", 200)
        if success:
            photos = response if isinstance(response, list) else []
            print(f"   Found {len(photos)} photos")
        return success, response

    def test_get_photos_by_theme(self, theme="nature"):
        """Test getting photos filtered by theme"""
        success, response = self.run_test(
            f"Get Photos by Theme ({theme})",
            "GET",
            f"photos?theme={theme}",
            200
        )
        if success:
            photos = response if isinstance(response, list) else []
            print(f"   Found {len(photos)} photos for theme '{theme}'")
        return success, response

    def test_upload_photo(self):
        """Test photo upload (requires admin token)"""
        if not self.token:
            self.log_test("Upload Photo", False, "No admin token available")
            return False, {}

        # Create a simple test image (1x1 pixel PNG)
        test_image_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\tpHYs\x00\x00\x0b\x13\x00\x00\x0b\x13\x01\x00\x9a\x9c\x18\x00\x00\x00\x12IDATx\x9cc```bPPP\x00\x02\xac\x01\x00\x00\x05\x00\x01\r\n-\xdb\x00\x00\x00\x00IEND\xaeB`\x82'
        
        files = {'image': ('test.png', test_image_data, 'image/png')}
        data = {
            'title': 'Test Photo',
            'description': 'A test photo for API testing',
            'theme': 'nature'
        }

        success, response = self.run_test(
            "Upload Photo",
            "POST",
            "photos",
            200,
            data=data,
            files=files
        )
        
        if success:
            photo_id = response.get('id')
            print(f"   Photo uploaded with ID: {photo_id}")
            return success, response
        return success, response

    def test_like_photo(self, photo_id):
        """Test liking a photo"""
        if not photo_id:
            self.log_test("Like Photo", False, "No photo ID provided")
            return False, {}

        success, response = self.run_test(
            "Like Photo",
            "POST",
            f"photos/{photo_id}/like",
            200
        )
        
        if success:
            likes = response.get('likes', 0)
            already_liked = response.get('already_liked', False)
            print(f"   Photo now has {likes} likes (already_liked: {already_liked})")
        return success, response

    def test_check_liked(self, photo_id):
        """Test checking if photo is liked by current IP"""
        if not photo_id:
            self.log_test("Check Liked", False, "No photo ID provided")
            return False, {}

        success, response = self.run_test(
            "Check Liked Status",
            "GET",
            f"photos/{photo_id}/liked",
            200
        )
        
        if success:
            liked = response.get('liked', False)
            print(f"   Photo liked by current IP: {liked}")
        return success, response

    def test_delete_photo(self, photo_id):
        """Test deleting a photo (requires admin token)"""
        if not self.token:
            self.log_test("Delete Photo", False, "No admin token available")
            return False, {}
        
        if not photo_id:
            self.log_test("Delete Photo", False, "No photo ID provided")
            return False, {}

        success, response = self.run_test(
            "Delete Photo",
            "DELETE",
            f"photos/{photo_id}",
            200
        )
        
        if success:
            print(f"   Photo {photo_id} deleted successfully")
        return success, response

    def run_full_test_suite(self):
        """Run complete test suite"""
        print("🚀 Starting Photo Gallery API Test Suite")
        print(f"📍 Testing against: {self.base_url}")
        print("=" * 60)

        # Test basic connectivity
        self.test_root_endpoint()
        
        # Check admin status
        admin_check_success, admin_check_response = self.test_admin_check()
        admin_exists = admin_check_response.get('exists', False) if admin_check_success else False
        
        # Setup or login admin
        if admin_exists:
            print("\n📝 Admin exists, attempting login...")
            login_success, _ = self.test_admin_login()
        else:
            print("\n📝 No admin found, creating admin account...")
            setup_success, _ = self.test_admin_setup()
            login_success = setup_success
        
        # Verify admin token
        if login_success:
            self.test_admin_verify()
        
        # Test themes
        themes_success, themes_response = self.test_get_themes()
        
        # Test photos
        photos_success, photos_response = self.test_get_photos()
        
        # Test theme filtering
        if themes_success and themes_response:
            themes = themes_response if isinstance(themes_response, list) else []
            if themes:
                first_theme = themes[0].get('slug', 'nature')
                self.test_get_photos_by_theme(first_theme)
        
        # Test photo upload and related operations
        upload_success, upload_response = self.test_upload_photo()
        
        if upload_success:
            photo_id = upload_response.get('id')
            if photo_id:
                # Test like functionality
                self.test_like_photo(photo_id)
                self.test_check_liked(photo_id)
                
                # Test delete (cleanup)
                self.test_delete_photo(photo_id)

        # Print summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"Total tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        # Show failed tests
        failed_tests = [t for t in self.test_results if not t['success']]
        if failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"   - {test['test']}: {test['details']}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = PhotoGalleryAPITester()
    success = tester.run_full_test_suite()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())