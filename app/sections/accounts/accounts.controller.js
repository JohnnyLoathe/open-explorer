import {sha256} from "js-sha256";

(function () {
    'use strict';

    angular.module('app.accounts')
        .controller('accountsCtrl', ['$scope', '$filter', '$routeParams', '$location', '$http', '$websocket',
            'appConfig', 'utilities', 'accountService', 'assetService', accountsCtrl]);

    function accountsCtrl($scope, $filter, $routeParams, $location, $http, $websocket, appConfig, utilities,
                          accountService, assetService) {

		const path = $location.path();
		let name = $routeParams.name;
		if(name) {
            name = name.toLowerCase();
			if(path.includes("accounts")) {

                accountService.getFullAccount(name, function (fullAccount) {

                    let cashback_balance_id = "";
                    let cashback_balance_balance = 0;
                    if(fullAccount.cashback_balance !== undefined &&
                        Object.keys(fullAccount.cashback_balance).length > 0) {
                        cashback_balance_id = fullAccount.cashback_balance.id;
                        cashback_balance_balance = fullAccount.cashback_balance.balance.amount;
                    }

                    let lifetime = "free member";
                    if (fullAccount.account.id === fullAccount.account.lifetime_referrer) {
                        lifetime = "lifetime member";
                    }

                    let vesting_balances = [];
                    accountService.parseVesting(fullAccount.vesting_balances, function (returnData) {
                        vesting_balances = returnData;
                    });

                    const lifetime_fees_paid = fullAccount.statistics.lifetime_fees_paid;
                    const bts_balance = fullAccount.balances[0].balance;

                    jdenticon.update("#identicon", sha256(fullAccount.account.name));

                    accountService.getTotalAccountOps(fullAccount.account.id, function (returnDataTotalOps) {
                        const total_ops = returnDataTotalOps;

                        $scope.select = function(page_operations) {
                            const page = page_operations -1;
                            const start = returnDataTotalOps - (page * 20) + 1;
                            const limit = 20;

                            accountService.getAccountHistory(fullAccount.account.id, start, limit,
                                function (returnData) {
                                $scope.operations = returnData;
                                $scope.currentPage = page_operations;
                            });
                        };
                        $scope.select(1);

                        accountService.getAccountName(fullAccount.account.options.voting_account,
                            function (returnData) {

                            $scope.account = {
                                name: fullAccount.account.name,
                                id: fullAccount.account.id,
                                referer: fullAccount.referrer_name,
                                registrar: fullAccount.registrar_name,
                                statistics: fullAccount.account.statistics,
                                cashback: cashback_balance_id,
                                cashback_balance: utilities.formatBalance(cashback_balance_balance, 5),
                                lifetime: lifetime,
                                total_ops: total_ops,
                                lifetime_fees_paid: parseInt(utilities.formatBalance(lifetime_fees_paid, 5)),
                                bts_balance: parseInt(utilities.formatBalance(bts_balance, 5)),
                                vesting: vesting_balances,
                                memo_key: fullAccount.account.options.memo_key,
                                voting_account_id: fullAccount.account.options.voting_account,
                                voting_account_name: returnData
                            };
                        });
                    });

                    $scope.select_balances = function(page_balances) {
                        const page = page_balances -1;
                        let balances = [];
                        let total_counter = 0;
                        let limit_counter = 0;
                        const limit = 10;
                        const start = page * limit;
                        angular.forEach(fullAccount.balances, function (value, key) {

                            if(total_counter >= start && limit_counter <= limit) {
                                assetService.getAssetNameAndPrecision(value.asset_type, function (returnData) {
                                    accountService.parseBalance(fullAccount.limit_orders,
                                        fullAccount.call_orders,
                                        value,
                                        returnData.precision,
                                        returnData.symbol, function (returnData2) {
                                            balances.push(returnData2);

                                        });
                                });
                                ++limit_counter;
                            }
                            ++total_counter;
                        });
                        $scope.balances = balances;
                        $scope.currentPageBalance = page_balances;
                        $scope.balance_count = total_counter;

                    };
                    $scope.select_balances(1);

                    accountService.parseUIAs(fullAccount.assets, function (returnData) {
                        $scope.user_issued_assets = returnData;
                    });

                    accountService.parseAuth(fullAccount.account.owner.key_auths, "key", function (returnData) {
                        $scope.owner_keys = returnData;
                    });

                    accountService.parseAuth(fullAccount.account.owner.account_auths, "account",
                        function (returnData) {
                        $scope.owner_accounts = returnData;
                    });

                    accountService.parseAuth(fullAccount.account.active.key_auths, "key", function (returnData) {
                        $scope.active_keys = returnData;
                    });

                    accountService.parseAuth(fullAccount.account.active.account_auths, "account",
                        function (returnData) {
                        $scope.active_accounts = returnData;
                    });

                    const account_id = fullAccount.account.id;
                    accountService.checkIfWorker(account_id, function (returnData) {
                        $scope.is_worker = returnData[0];
                        $scope.worker_votes = returnData[1];
                    });
                    accountService.checkIfWitness(account_id, function (returnData) {
                        $scope.is_witness = returnData[0];
                        $scope.witness_votes = returnData[1];
                        $scope.witness_account = returnData[2];
                        $scope.witness_account_name = returnData[3];
                        $scope.witness_id = returnData[4];
                        $scope.witness_url = returnData[5];
                    });
                    accountService.checkIfCommittee(account_id, function (returnData) {
                        $scope.is_committee_member = returnData[0];
                        $scope.committee_votes = returnData[1];
                        $scope.committee_member_account = returnData[2];
                        $scope.committee_member_account_name = returnData[3];
                        $scope.committee_id = returnData[4];
                        $scope.committee_url = returnData[5];
                    });
                    accountService.checkIfProxy(account_id, function (returnData) {
                        $scope.is_proxy = returnData[0];
                        $scope.proxy_votes = returnData[1];
                    });

                    accountService.parseProposals(fullAccount.proposals, function (returnData) {
                        $scope.proposals = returnData;
                    });

                    accountService.parseVotes(fullAccount.votes, function (returnData) {
                        $scope.votes = returnData;
                    });

                    accountService.getReferrerCount(name, function (returnData) {
                        $scope.referral_count = returnData;
                    });

                    $scope.select_referers = function(page_referers) {
                        const page = page_referers -1;

                        accountService.getReferrers(name, page, function (returnData) {
                            $scope.referrers = returnData;
                            $scope.currentPageReferer = page_referers;
                        });
                    };
                    $scope.select_referers(1);

                    utilities.columnsort($scope, "balance", "sortColumn", "sortClass", "reverse", "reverseclass",
                        "column");
                });
            }
		}
		else {
            if(path === "/accounts") {
                accountService.getRichList(function (returnData) {
                    $scope.richs = returnData;
                });
                utilities.columnsort($scope, "amount", "sortColumn", "sortClass", "reverse", "reverseclass", "column");
			}
		}
    }

})();
